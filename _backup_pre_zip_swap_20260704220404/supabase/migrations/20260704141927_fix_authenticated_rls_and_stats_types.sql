-- ============================================================================
-- Fix two independent, severe regressions introduced across earlier hardening
-- migrations that were never actually exercised end-to-end (no test suite
-- exists in this repo — see the architecture audit). Found while
-- investigating "/admin/encheres stuck on Chargement" — the real blast
-- radius is much larger than that one page.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) RLS policies that read cars.vendeur_id directly are unevaluable for
--    `authenticated`, because a later migration (20260704090557) revoked
--    column-level SELECT on cars.vendeur_id from `authenticated`. Postgres
--    requires SELECT privilege on any column referenced inside an RLS policy
--    expression, even when that column is only read to evaluate a subquery/
--    row-match, not returned to the client. Net effect verified empirically:
--    EVERY authenticated user gets "permission denied for table cars"
--    (SQLSTATE 42501) on:
--      - any SELECT on `auctions` at all (auctions_select_authenticated's
--        "am I the car's seller" branch), and
--      - any UPDATE on `cars` at all (cars_update_owner_or_admin), including
--        a seller editing their own listing.
--    This is not cosmetic — it breaks auction browsing and car editing for
--    every logged-in role (buyer/seller/expert/admin alike), on the cloud
--    project too, since it's the same migration history.
--
--    Fix: evaluate the ownership check through a SECURITY DEFINER helper
--    (the same pattern already used for has_role()) so it runs with the
--    function owner's privileges instead of the querying role's column
--    grants.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_car_owner(p_car_id text, p_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cars WHERE id = p_car_id AND vendeur_id = p_uid
  );
$$;
REVOKE ALL ON FUNCTION public.is_car_owner(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_car_owner(text, uuid) TO authenticated;

DROP POLICY IF EXISTS auctions_select_authenticated ON public.auctions;
CREATE POLICY auctions_select_authenticated ON public.auctions
  FOR SELECT TO authenticated
  USING (
    visibility = 'ouvert'::auction_visibility_t
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR top_bidder_id = auth.uid()
    OR public.is_car_owner(car_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.bids b WHERE b.auction_id = auctions.id AND b.bidder_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.offers o WHERE o.auction_id = auctions.id AND o.user_id = auth.uid())
  );

DROP POLICY IF EXISTS cars_update_owner_or_admin ON public.cars;
CREATE POLICY cars_update_owner_or_admin ON public.cars
  FOR UPDATE TO authenticated
  USING (public.is_car_owner(id, auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.is_car_owner(id, auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

-- ----------------------------------------------------------------------------
-- 2) tick_auctions(): the frontend's client-side "lightweight tick" (a
--    throttled convenience call in src/lib/supabaseApi.ts so auction status
--    advances between pg_cron runs even if a page is just sitting open) calls
--    this RPC as the signed-in user. A later hardening migration revoked
--    EXECUTE from `authenticated` (treating it as cron-only), silently
--    breaking that feature (the frontend swallows the resulting 403, so it
--    fails quietly rather than crashing — but it stopped doing anything).
--    Restoring the original intended grant.
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.tick_auctions() TO authenticated;

-- ----------------------------------------------------------------------------
-- 3) Four admin RPCs declare RETURNS TABLE columns as `numeric` but their
--    query bodies actually produce `integer`/`bigint` (a plain int column,
--    or sum() of one) — Postgres's plpgsql RETURN QUERY requires an exact
--    type match, not just an implicit-cast-compatible one, so every call to
--    these functions fails with 42804 "structure of query does not match
--    function result type". Verified empirically: admin_auction_stats,
--    admin_revenue_series, admin_list_pending_validations, and
--    admin_list_processed_validations have never successfully returned data
--    (on the cloud project either) since these numeric columns were added —
--    the entire admin analytics dashboard and validation queue were
--    non-functional. Fix: cast the numeric-declared expressions explicitly.
-- ----------------------------------------------------------------------------

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
      (SELECT COALESCE(sum(current_price),0)::numeric FROM public.auctions WHERE status='validated' AND updated_at >= p_since),
      (SELECT count(*)::int FROM public.auctions WHERE status IN ('closed','validated','cancelled') AND updated_at >= p_since),
      (SELECT count(*)::int FROM public.auctions WHERE status IN ('closed','validated') AND updated_at >= p_since AND bid_count > 0),
      (SELECT COALESCE(sum(current_price),0)::numeric FROM public.auctions WHERE status='validated');
END $$;

CREATE OR REPLACE FUNCTION public.admin_revenue_series(p_since timestamptz)
RETURNS TABLE(current_price numeric, updated_at timestamptz, status public.auction_status_t)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs';
  END IF;
  RETURN QUERY
    SELECT a.current_price::numeric, a.updated_at, a.status FROM public.auctions a
    WHERE a.status IN ('closed','validated') AND a.updated_at >= p_since;
END $$;

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
    SELECT a.id, a.car_id, a.current_price::numeric, a.ends_at,
           a.top_bidder_id, a.updated_at, a.closed_at,
           a.admin_validation_deadline,
           c.marque, c.modele, c.annee, c.vendeur_nom, c.prix_attendu::numeric
    FROM public.auctions a
    JOIN public.cars c ON c.id = a.car_id
    WHERE a.status = 'closed'
    ORDER BY a.admin_validation_deadline ASC;
END $$;

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
    SELECT a.id, a.car_id, a.current_price::numeric, a.status,
           a.top_bidder_id, a.validated_at, a.updated_at, a.payment_deadline,
           c.marque, c.modele, c.annee, c.vendeur_nom
    FROM public.auctions a
    JOIN public.cars c ON c.id = a.car_id
    WHERE a.status IN ('validated','cancelled')
    ORDER BY a.updated_at DESC
    LIMIT 100;
END $$;
