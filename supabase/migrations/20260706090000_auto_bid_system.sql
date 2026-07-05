-- Real auto-bid system. Previously 100% UI scaffolding: the toggle called
-- api.setAutoBid(), which was a client-side no-op (see supabaseApi.ts) —
-- the max amount was never even sent to the server, and no mechanism ever
-- placed a bid on anyone's behalf. This adds the missing pieces:
--   1. auto_bids — one row per (auction, user), their max + on/off state.
--   2. set_auto_bid() — the only way to write to it (validates caution,
--      auction type/state, and that the max leaves room for at least one
--      increment).
--   3. process_auto_bids() — the actual proxy-bidding engine. Called from
--      place_bid() after every bid (manual or auto) and once immediately
--      from set_auto_bid() when turning on. Repeatedly finds the highest
--      remaining competing bidder who can still afford current+1000 and
--      places their bid, until no one can outbid the leader anymore — then
--      disables (and notifies) anyone who's now permanently priced out.

CREATE TABLE public.auto_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id text NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_amount int NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (auction_id, user_id)
);
CREATE INDEX idx_auto_bids_auction ON public.auto_bids(auction_id);
CREATE TRIGGER trg_auto_bids_updated_at BEFORE UPDATE ON public.auto_bids
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- A user's own max amount is sensitive (reveals their budget/strategy to
-- anyone who could otherwise read it) — only the owner and admins may see
-- or write their row. All writes go through set_auto_bid() below anyway;
-- direct INSERT/UPDATE grants exist for completeness but the RPC is what
-- the frontend actually calls.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.auto_bids TO authenticated;
GRANT ALL ON public.auto_bids TO service_role;
ALTER TABLE public.auto_bids ENABLE ROW LEVEL SECURITY;
CREATE POLICY auto_bids_own ON public.auto_bids
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.process_auto_bids(p_auction_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_auction public.auctions;
  v_candidate RECORD;
  v_next_amount int;
  v_name text;
  v_iterations int := 0;
BEGIN
  LOOP
    v_iterations := v_iterations + 1;
    EXIT WHEN v_iterations > 200; -- safety valve, not a realistically reachable depth

    SELECT * INTO v_auction FROM public.auctions WHERE id = p_auction_id FOR UPDATE;
    EXIT WHEN NOT FOUND OR v_auction.status <> 'live';

    v_next_amount := v_auction.current_price + 1000;

    -- Highest remaining bidder (excluding the current leader) who can still
    -- afford the next increment. Ties broken by whoever set their max
    -- first, matching how a real proxy-bidding war would resolve.
    SELECT ab.* INTO v_candidate
      FROM public.auto_bids ab
      WHERE ab.auction_id = p_auction_id
        AND ab.enabled = true
        AND ab.user_id IS DISTINCT FROM v_auction.top_bidder_id
        AND ab.max_amount >= v_next_amount
      ORDER BY ab.max_amount DESC, ab.updated_at ASC
      LIMIT 1;

    EXIT WHEN NOT FOUND;

    SELECT nom INTO v_name FROM public.profiles WHERE user_id = v_candidate.user_id;

    INSERT INTO public.bids (auction_id, car_id, bidder_id, bidder_name, amount, is_auto)
    VALUES (p_auction_id, v_auction.car_id, v_candidate.user_id, COALESCE(NULLIF(v_name,''),'Anonyme'), v_next_amount, true);
    -- ^ fires the existing trg_notify_on_bid trigger automatically, so the
    -- buyer who just got out-auto-bid gets their usual "outbid" notification.

    UPDATE public.auctions
      SET current_price = v_next_amount,
          bid_count = bid_count + 1,
          top_bidder_id = v_candidate.user_id,
          ends_at = CASE WHEN ends_at - now() <= INTERVAL '2 minutes' THEN now() + INTERVAL '2 minutes' ELSE ends_at END
      WHERE id = p_auction_id;
  END LOOP;

  -- Anyone left enabled who can no longer possibly outbid the current
  -- leader has hit their ceiling — disable and tell them once, so their
  -- toggle shows off next time they load the page.
  FOR v_candidate IN
    SELECT ab.user_id, ab.max_amount
      FROM public.auto_bids ab
      JOIN public.auctions a ON a.id = p_auction_id
      WHERE ab.auction_id = p_auction_id
        AND ab.enabled = true
        AND ab.user_id IS DISTINCT FROM a.top_bidder_id
        AND ab.max_amount < a.current_price + 1000
  LOOP
    UPDATE public.auto_bids SET enabled = false, updated_at = now()
      WHERE auction_id = p_auction_id AND user_id = v_candidate.user_id;
    INSERT INTO public.notifications (user_id, type, titre, message, auction_id)
    VALUES (v_candidate.user_id, 'system', 'Auto-enchère désactivée',
      'Votre montant maximum de ' || v_candidate.max_amount || ' DH a été atteint. Augmentez-le pour continuer à enchérir automatiquement.',
      p_auction_id);
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.process_auto_bids(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_auto_bid(p_auction_id text, p_enabled boolean, p_max_amount int DEFAULT NULL)
RETURNS public.auto_bids
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_auction public.auctions;
  v_caution boolean;
  v_row public.auto_bids;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Vous devez être connecté pour enchérir.'; END IF;
  SELECT caution_validee INTO v_caution FROM public.profiles WHERE user_id = v_user;
  IF NOT COALESCE(v_caution, false) THEN
    RAISE EXCEPTION 'Caution requise pour enchérir';
  END IF;

  SELECT * INTO v_auction FROM public.auctions WHERE id = p_auction_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Enchère introuvable'; END IF;
  IF v_auction.auction_type = 'fermee' THEN
    RAISE EXCEPTION 'L''auto-enchère n''est pas disponible pour les enchères à enveloppe fermée.';
  END IF;
  IF v_auction.status <> 'live' THEN
    RAISE EXCEPTION 'Cette enchère n''est plus active';
  END IF;

  IF p_enabled AND (p_max_amount IS NULL OR p_max_amount < v_auction.current_price + 1000) THEN
    RAISE EXCEPTION 'Le montant max doit être d''au moins % DH', v_auction.current_price + 1000;
  END IF;

  INSERT INTO public.auto_bids (auction_id, user_id, max_amount, enabled)
  VALUES (p_auction_id, v_user, COALESCE(p_max_amount, 0), p_enabled)
  ON CONFLICT (auction_id, user_id) DO UPDATE
    SET max_amount = COALESCE(p_max_amount, public.auto_bids.max_amount),
        enabled = p_enabled,
        updated_at = now()
  RETURNING * INTO v_row;

  IF p_enabled THEN
    PERFORM public.process_auto_bids(p_auction_id);
    SELECT * INTO v_row FROM public.auto_bids WHERE auction_id = p_auction_id AND user_id = v_user;
  END IF;

  RETURN v_row;
END $$;
REVOKE ALL ON FUNCTION public.set_auto_bid(text, boolean, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_auto_bid(text, boolean, int) TO authenticated;
