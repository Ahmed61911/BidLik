-- Fix a pre-existing gap surfaced by the local-storage migration: the expert
-- inspection flow (src/routes/expert.inspections.$inspectionId.tsx →
-- src/lib/supabaseExpertApi.ts submitReport()) writes cars.expert_images and
-- cars.images directly via the authenticated client, but
-- cars_update_owner_or_admin only ever allowed the car's own vendeur or an
-- admin to UPDATE cars — never the assigned expert. That update was always
-- silently blocked by RLS (no error surfaced client-side, since the code
-- never checked `{ error }` on this particular call), so expert-submitted
-- photos never actually reached cars.images/expert_images even though the
-- report note/comment/rapport_url did (those go through the
-- SECURITY DEFINER submit_expert_report() RPC, which bypasses this policy
-- entirely). Only became visible once the storage migration made this path
-- carry real files instead of being dead code.
CREATE OR REPLACE FUNCTION public.is_assigned_expert(p_car_id text, p_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.expert_assignments
    WHERE car_id = p_car_id AND expert_id = p_uid
  );
$$;
REVOKE ALL ON FUNCTION public.is_assigned_expert(text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_assigned_expert(text, uuid) TO authenticated;

DROP POLICY IF EXISTS cars_update_owner_or_admin ON public.cars;
CREATE POLICY cars_update_owner_or_admin ON public.cars
  FOR UPDATE TO authenticated
  USING (
    public.is_car_owner(id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_assigned_expert(id, auth.uid())
  )
  WITH CHECK (
    public.is_car_owner(id, auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_assigned_expert(id, auth.uid())
  );
