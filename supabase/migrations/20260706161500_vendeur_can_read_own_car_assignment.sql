-- expert_assignments previously only allowed admin or the assigned expert to
-- SELECT, so a car's own vendeur could never see who inspected their car or
-- its inspection status — supabaseVendeurApi.fetchMyCars()'s direct
-- .from("expert_assignments") read always came back empty for them, making
-- the "Mes voitures" dashboard permanently show "À assigner" / "Non assigné"
-- even after a report was submitted.
--
-- Uses is_car_owner() (SECURITY DEFINER, see 20260704220638) rather than a
-- raw `cars.vendeur_id = auth.uid()` subquery: vendeur_id is deliberately
-- excluded from authenticated's column-level SELECT grant on cars (see
-- 20260704220610), and Postgres checks column privileges on every table
-- referenced by a policy's USING clause regardless of RLS — a raw subquery
-- referencing vendeur_id would fail with "permission denied for table cars"
-- for every authenticated caller, not just non-owners.
CREATE POLICY "ea_select_car_owner" ON public.expert_assignments
  FOR SELECT TO authenticated
  USING (public.is_car_owner(car_id, auth.uid()));
