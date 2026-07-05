-- Wires the new auto-bid engine into place_bid(): after a bid is inserted
-- and the auction row updated (unchanged from before), give any competing
-- auto-bidder a chance to respond. Body is otherwise byte-for-byte the same
-- as 20260704094812's version — only the final PERFORM line is new.
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

  -- NEW: give any competing auto-bidder a chance to respond to this bid.
  PERFORM public.process_auto_bids(p_auction_id);

  RETURN v_bid;
END; $function$;
