
CREATE OR REPLACE FUNCTION public.list_my_pending_payment_auctions()
RETURNS SETOF public.auctions
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.auctions
  WHERE top_bidder_id = auth.uid()
    AND status = 'validated'
  ORDER BY payment_deadline NULLS LAST;
$$;
REVOKE EXECUTE ON FUNCTION public.list_my_pending_payment_auctions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_pending_payment_auctions() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_auction(p_id text)
RETURNS public.auctions
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.auctions;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs';
  END IF;
  SELECT * INTO v FROM public.auctions WHERE id = p_id;
  RETURN v;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_get_auction(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_auction(text) TO authenticated;
