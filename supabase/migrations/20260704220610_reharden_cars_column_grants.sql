-- ============================================================================
-- Re-harden public.cars column grants after 20260704212315.
--
-- That migration (from a parallel session on the hosted project, merged in
-- here) did:
--   GRANT SELECT (..., minimum_accepted_price, ...) ON public.cars TO anon;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON public.cars TO authenticated;
--
-- The second line is an UNQUALIFIED table-level SELECT grant — in Postgres
-- that's a superset of any earlier column-level grant, so it silently
-- re-exposed EVERY column of `cars` to every authenticated user, including
-- vendeur_id (seller identity) and minimum_accepted_price / prix_plancher /
-- prix_minimum (sealed-auction reserve/floor prices) — exactly the fields
-- migration 20260704094812 deliberately hid via column-level REVOKE. The
-- first line separately re-exposed minimum_accepted_price to anon
-- specifically. Both look like side effects of that session chasing the
-- same "permission denied for table cars" bug this branch already fixed
-- properly (see 20260704221... is_car_owner()-based RLS fix) by broadening
-- grants instead of finding the real cause.
--
-- This does not touch the RLS policies themselves (those correctly restrict
-- *rows*; column grants restrict *which columns* a role may read even on a
-- visible row) — it only re-scopes the column-level SELECT grants back to
-- the safe list, now including the two legitimate additions from that same
-- session (payment_status, delivery_status).
-- ============================================================================

REVOKE SELECT ON public.cars FROM authenticated;
GRANT SELECT (
  id, type, marque, modele, finition, transmission, carburant,
  annee, kilometrage, couleur_exterieur, couleur_interieur,
  note_expert, nombre_cles, puissance_fiscale, carte_grise_barree,
  procuration, date_vente, status, images, body_type, prix_attendu,
  payment_status, delivery_status, created_at, updated_at
) ON public.cars TO authenticated;
-- INSERT/UPDATE/DELETE stay table-level (RLS + is_car_owner()/has_role()
-- enforce ownership on writes); only broad SELECT is being narrowed here.
GRANT INSERT, UPDATE, DELETE ON public.cars TO authenticated;

REVOKE SELECT (minimum_accepted_price, prix_plancher, prix_minimum, vendeur_id)
  ON public.cars FROM anon;
