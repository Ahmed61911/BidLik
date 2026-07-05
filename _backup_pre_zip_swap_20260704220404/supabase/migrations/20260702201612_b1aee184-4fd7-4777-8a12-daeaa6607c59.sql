
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

CREATE OR REPLACE FUNCTION public.admin_list_pending_validations()
RETURNS TABLE(
  id text, car_id text, current_price numeric, ends_at timestamptz,
  top_bidder_id uuid, updated_at timestamptz, closed_at timestamptz,
  admin_validation_deadline timestamptz,
  marque text, modele text, annee int, vendeur_nom text, prix_attendu numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs';
  END IF;
  RETURN QUERY
    SELECT a.id, a.car_id, a.current_price, a.ends_at,
           a.top_bidder_id, a.updated_at, a.closed_at,
           a.admin_validation_deadline,
           c.marque, c.modele, c.annee, c.vendeur_nom, c.prix_attendu
    FROM public.auctions a
    JOIN public.cars c ON c.id = a.car_id
    WHERE a.status = 'closed'
    ORDER BY a.admin_validation_deadline ASC;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_list_pending_validations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_pending_validations() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_processed_validations()
RETURNS TABLE(
  id text, car_id text, current_price numeric, status public.auction_status_t,
  top_bidder_id uuid, validated_at timestamptz, updated_at timestamptz,
  payment_deadline timestamptz,
  marque text, modele text, annee int, vendeur_nom text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs';
  END IF;
  RETURN QUERY
    SELECT a.id, a.car_id, a.current_price, a.status,
           a.top_bidder_id, a.validated_at, a.updated_at, a.payment_deadline,
           c.marque, c.modele, c.annee, c.vendeur_nom
    FROM public.auctions a
    JOIN public.cars c ON c.id = a.car_id
    WHERE a.status IN ('validated','cancelled')
    ORDER BY a.updated_at DESC
    LIMIT 100;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_list_processed_validations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_processed_validations() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_auction_stats(p_since timestamptz)
RETURNS TABLE(
  total_auctions int, live_auctions int, pending_validations int,
  validated_month_count int, validated_month_volume numeric,
  closed_month_total int, closed_month_with_bids int,
  total_validated_volume numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs';
  END IF;
  RETURN QUERY
    SELECT
      (SELECT count(*)::int FROM public.auctions),
      (SELECT count(*)::int FROM public.auctions WHERE status='live'),
      (SELECT count(*)::int FROM public.auctions WHERE status='closed'),
      (SELECT count(*)::int FROM public.auctions WHERE status='validated' AND updated_at >= p_since),
      (SELECT COALESCE(sum(current_price),0) FROM public.auctions WHERE status='validated' AND updated_at >= p_since),
      (SELECT count(*)::int FROM public.auctions WHERE status IN ('closed','validated','cancelled') AND updated_at >= p_since),
      (SELECT count(*)::int FROM public.auctions WHERE status IN ('closed','validated') AND updated_at >= p_since AND bid_count > 0),
      (SELECT COALESCE(sum(current_price),0) FROM public.auctions WHERE status='validated');
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_auction_stats(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_auction_stats(timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_revenue_series(p_since timestamptz)
RETURNS TABLE(current_price numeric, updated_at timestamptz, status public.auction_status_t)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs';
  END IF;
  RETURN QUERY
    SELECT a.current_price, a.updated_at, a.status FROM public.auctions a
    WHERE a.status IN ('closed','validated') AND a.updated_at >= p_since;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_revenue_series(timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revenue_series(timestamptz) TO authenticated;
