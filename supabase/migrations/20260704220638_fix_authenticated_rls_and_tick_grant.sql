-- ============================================================================
-- Fix a severe regression found while self-hosting this project locally:
-- two RLS policies read cars.vendeur_id directly in a subquery, but a
-- hardening migration (20260704090557) revoked column-level SELECT on
-- cars.vendeur_id from `authenticated`. Postgres requires SELECT privilege
-- on any column referenced inside an RLS policy expression, even when it's
-- only read to evaluate a row match, not returned to the client. Net effect,
-- verified empirically against a fresh replay of this exact migration
-- history: EVERY authenticated user gets "permission denied for table cars"
-- (SQLSTATE 42501) on:
--   - any SELECT on `auctions` at all (auctions_select_authenticated's
--     "am I the car's seller" branch), and
--   - any UPDATE on `cars` at all (cars_update_owner_or_admin), including a
--     seller editing their own listing.
-- This breaks auction browsing and car editing for every logged-in role
-- (buyer/seller/expert/admin alike) — not cosmetic.
--
-- Fix: evaluate the ownership check through a SECURITY DEFINER helper (the
-- same pattern already used for has_role()) so it runs with the function
-- owner's privileges instead of the querying role's column grants.
--
-- Also restores EXECUTE on tick_auctions() for `authenticated`: the
-- frontend's client-side "lightweight tick" (src/lib/supabaseApi.ts) calls
-- this RPC so auction status advances between pg_cron runs even while a
-- page is open; a hardening migration revoked that grant, silently breaking
-- the feature (the frontend swallows the resulting 403).
--
-- Also fixes admin_auction_stats / admin_revenue_series: both declare
-- RETURNS TABLE columns as `numeric` but their query bodies produce
-- `integer`/`bigint` (a plain int column, or sum() of one) — Postgres's
-- plpgsql RETURN QUERY requires an exact type match, so every call failed
-- with 42804 "structure of query does not match function result type".
-- (admin_list_pending_validations / admin_list_processed_validations had
-- the identical bug and are already fixed by migration 20260704212631.)
-- ============================================================================

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

GRANT EXECUTE ON FUNCTION public.tick_auctions() TO authenticated;

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
