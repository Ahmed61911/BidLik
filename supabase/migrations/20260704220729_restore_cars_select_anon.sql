-- ============================================================================
-- Restore anonymous (public) read access to `cars`.
--
-- Migration 20260702201039 ("Auth/RBAC hardening cleanup") dropped
-- cars_select_anon and revoked SELECT on cars from anon while removing
-- sensitive-column visibility. Later migrations correctly restored anon's
-- SELECT via column-level GRANTs (see 20260704090557 / 20260704094812), but
-- no migration ever recreated the ROW-level policy that lets `anon` see any
-- row at all. Column-level GRANTs only restrict WHICH COLUMNS a role may
-- read — they do nothing without a permissive RLS policy allowing the row
-- itself. Net effect verified empirically: `GET /rest/v1/cars` returns `[]`
-- for every anonymous (not-logged-in) visitor, breaking public car/auction
-- browsing on /vehicules, /auctions, and every anonymous auction detail
-- page.
--
-- Fix: recreate cars_select_anon exactly as originally defined (permissive,
-- USING true) — the sensitive columns stay hidden via the column-level
-- GRANTs (see 20260704220610_reharden_cars_column_grants.sql), so this does
-- not re-expose vendeur_id / reserve prices to anonymous visitors.
-- ============================================================================

DROP POLICY IF EXISTS cars_select_anon ON public.cars;
CREATE POLICY cars_select_anon ON public.cars
  FOR SELECT TO anon
  USING (true);
