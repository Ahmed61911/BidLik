-- profiles was previously readable only by the profile owner or an admin, so
-- supabaseVendeurApi.fetchMyCars()'s profile lookups for a car's assigned
-- expert (expertNom) and winning buyer (acheteurNom) always came back empty
-- for a vendeur — the "Mes voitures" dashboard showed "Non assigné" even
-- once an expert had submitted a full report.
--
-- Uses a SECURITY DEFINER helper (same reasoning as is_car_owner in
-- 20260704220638): a raw policy subquery joining cars/expert_assignments/
-- auctions would need cars.vendeur_id and auctions.top_bidder_id, both
-- deliberately excluded from authenticated's column-level SELECT grants.
CREATE OR REPLACE FUNCTION public.is_related_to_my_car(p_profile_user_id uuid, p_caller uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.expert_assignments ea
    JOIN public.cars c ON c.id = ea.car_id
    WHERE c.vendeur_id = p_caller AND ea.expert_id = p_profile_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.auctions a
    JOIN public.cars c ON c.id = a.car_id
    WHERE c.vendeur_id = p_caller AND a.top_bidder_id = p_profile_user_id
  );
$$;
REVOKE ALL ON FUNCTION public.is_related_to_my_car(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_related_to_my_car(uuid, uuid) TO authenticated;

CREATE POLICY "profiles_select_related_to_my_car" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_related_to_my_car(user_id, auth.uid()));
