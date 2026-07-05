-- ============================================================================
-- Restore anonymous (public) read access to `cars`.
--
-- Bug found during the local self-hosting migration: migration
-- 20260702201039 ("Pass 1: Auth/RBAC + DB security hardening" cleanup) did
--   DROP POLICY IF EXISTS cars_select_anon ON public.cars;
--   REVOKE SELECT ON public.cars FROM anon;
-- as part of removing anon's ability to see sensitive columns
-- (vendeur_id, minimum_accepted_price, prix_plancher, prix_minimum). Later
-- migrations correctly restored anon's SELECT via column-level GRANTs
-- (see 20260704090557), but no migration ever recreated the ROW-level policy
-- that lets `anon` see any row at all. Column-level GRANTs only restrict
-- WHICH COLUMNS a role may read — they do nothing without a permissive RLS
-- policy allowing the row itself. Net effect verified empirically:
-- `GET /rest/v1/cars` returns `[]` for every anonymous (not-logged-in)
-- visitor, breaking public car/auction browsing on /vehicules, /auctions,
-- and every anonymous auction detail page — this affects the production
-- cloud project too, not just this local copy, since it's the same
-- migration history.
--
-- Fix: recreate cars_select_anon exactly as originally defined (permissive,
-- USING true) — the sensitive columns stay hidden via the column-level
-- GRANT that already exists, so this does not re-expose vendeur_id / reserve
-- prices to anonymous visitors.
-- ============================================================================

CREATE POLICY cars_select_anon ON public.cars
  FOR SELECT TO anon
  USING (true);
