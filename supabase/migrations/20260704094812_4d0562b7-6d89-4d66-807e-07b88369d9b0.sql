
-- 1) Hide sensitive car columns from bidders
REVOKE SELECT (vendeur_id, minimum_accepted_price, prix_plancher, prix_minimum)
  ON public.cars FROM authenticated;
REVOKE SELECT (vendeur_id, minimum_accepted_price, prix_plancher, prix_minimum)
  ON public.cars FROM anon;

-- 2) Restrict profile self-updates to safe columns only
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (nom, telephone, ville, avatar_url) ON public.profiles TO authenticated;

-- 3) Enforce caution in bidding RPCs
CREATE OR REPLACE FUNCTION public.place_bid(p_auction_id text, p_amount integer, p_is_auto boolean DEFAULT false)
 RETURNS bids
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_auction public.auctions;
  v_user UUID := auth.uid();
  v_name TEXT;
  v_bid public.bids;
  v_new_end TIMESTAMPTZ;
  v_caution BOOLEAN;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Vous devez être connecté pour enchérir.'; END IF;
  SELECT caution_validee INTO v_caution FROM public.profiles WHERE user_id = v_user;
  IF NOT COALESCE(v_caution, false) THEN
    RAISE EXCEPTION 'Caution requise pour enchérir';
  END IF;
  SELECT * INTO v_auction FROM public.auctions WHERE id = p_auction_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Enchère introuvable'; END IF;
  IF v_auction.auction_type = 'fermee' THEN
    RAISE EXCEPTION 'Cette enchère est à enveloppe fermée. Soumettez une offre confidentielle.';
  END IF;
  IF v_auction.status = 'scheduled' AND v_auction.starts_at <= now() THEN
    UPDATE public.auctions SET status = 'live' WHERE id = p_auction_id;
    v_auction.status := 'live';
  END IF;
  IF v_auction.status <> 'live' THEN RAISE EXCEPTION 'Cette enchère n''est plus active'; END IF;
  IF v_auction.ends_at <= now() THEN
    UPDATE public.auctions SET status = 'closed' WHERE id = p_auction_id;
    RAISE EXCEPTION 'L''enchère est terminée';
  END IF;
  IF p_amount <= v_auction.current_price THEN
    RAISE EXCEPTION 'Votre offre doit dépasser % DH', v_auction.current_price;
  END IF;
  SELECT nom INTO v_name FROM public.profiles WHERE user_id = v_user;
  INSERT INTO public.bids (auction_id, car_id, bidder_id, bidder_name, amount, is_auto)
  VALUES (p_auction_id, v_auction.car_id, v_user, COALESCE(NULLIF(v_name,''),'Anonyme'), p_amount, p_is_auto)
  RETURNING * INTO v_bid;

  IF v_auction.ends_at - now() <= INTERVAL '2 minutes' THEN
    v_new_end := now() + INTERVAL '2 minutes';
  ELSE
    v_new_end := v_auction.ends_at;
  END IF;

  UPDATE public.auctions
  SET current_price = p_amount, bid_count = bid_count + 1,
      top_bidder_id = v_user, ends_at = v_new_end
  WHERE id = p_auction_id;
  RETURN v_bid;
END; $function$;

CREATE OR REPLACE FUNCTION public.submit_offer(p_auction_id text, p_amount integer)
 RETURNS offers
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_auction public.auctions;
  v_car public.cars;
  v_user UUID := auth.uid();
  v_name TEXT;
  v_offer public.offers;
  v_min INT;
  v_count INT;
  v_caution BOOLEAN;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Vous devez être connecté pour soumettre une offre.'; END IF;
  SELECT caution_validee INTO v_caution FROM public.profiles WHERE user_id = v_user;
  IF NOT COALESCE(v_caution, false) THEN
    RAISE EXCEPTION 'Caution requise pour soumettre une offre';
  END IF;
  SELECT * INTO v_auction FROM public.auctions WHERE id = p_auction_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Enchère introuvable'; END IF;
  IF v_auction.auction_type <> 'fermee' THEN
    RAISE EXCEPTION 'Cette enchère n''accepte pas d''offres confidentielles.';
  END IF;
  IF v_auction.status = 'scheduled' AND v_auction.starts_at <= now() THEN
    UPDATE public.auctions SET status = 'live' WHERE id = p_auction_id;
    v_auction.status := 'live';
  END IF;
  IF v_auction.status <> 'live' THEN RAISE EXCEPTION 'Cette enchère n''est plus active'; END IF;
  IF v_auction.ends_at <= now() THEN RAISE EXCEPTION 'L''enchère est terminée'; END IF;
  SELECT * INTO v_car FROM public.cars WHERE id = v_auction.car_id;
  v_min := COALESCE(v_car.minimum_accepted_price, v_auction.starting_price);
  IF NOT (p_amount > v_min) THEN
    RAISE EXCEPTION 'Votre offre doit être strictement supérieure à % DH', v_min;
  END IF;
  SELECT nom INTO v_name FROM public.profiles WHERE user_id = v_user;
  INSERT INTO public.offers (auction_id, car_id, user_id, user_name, amount)
  VALUES (p_auction_id, v_auction.car_id, v_user, COALESCE(NULLIF(v_name,''),'Anonyme'), p_amount)
  ON CONFLICT (auction_id, user_id) DO UPDATE
    SET amount = EXCLUDED.amount, updated_at = now()
  RETURNING * INTO v_offer;
  SELECT COUNT(*) INTO v_count FROM public.offers WHERE auction_id = p_auction_id;
  UPDATE public.auctions SET bid_count = v_count WHERE id = p_auction_id;
  RETURN v_offer;
END; $function$;

-- 4) Enforce auction visibility in SELECT policies
DROP POLICY IF EXISTS auctions_select_anon ON public.auctions;
DROP POLICY IF EXISTS auctions_select_authenticated ON public.auctions;

CREATE POLICY auctions_select_anon ON public.auctions
  FOR SELECT TO anon
  USING (visibility = 'ouvert'::auction_visibility_t);

CREATE POLICY auctions_select_authenticated ON public.auctions
  FOR SELECT TO authenticated
  USING (
    visibility = 'ouvert'::auction_visibility_t
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR top_bidder_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.cars c WHERE c.id = auctions.car_id AND c.vendeur_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.bids b WHERE b.auction_id = auctions.id AND b.bidder_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.offers o WHERE o.auction_id = auctions.id AND o.user_id = auth.uid())
  );
