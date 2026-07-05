-- Extends expert_list_car_details to return the full set of vehicle
-- fields an assigned expert needs to see (pre-fill on inspection open) and
-- confirm (same fields admin locks after expert validation — see
-- EXPERT_LOCKED_FIELDS in src/routes/admin.voitures.tsx), plus both photo
-- arrays so the expert's own past-report view can show everything they
-- submitted, not just the note/date summary.
--
-- Column-level grants already allow authenticated to read body_type,
-- transmission, carburant, couleur_exterieur, couleur_interieur, images
-- directly (see 20260704220610_reharden_cars_column_grants.sql) — this
-- SECURITY DEFINER function additionally needs expert_images, which is
-- deliberately NOT granted broadly (only admins/acheteurs see it per
-- get_car_expertise()), so the assigned expert reads their own uploads
-- through this function instead.
DROP FUNCTION IF EXISTS public.expert_list_car_details(text[]);

CREATE FUNCTION public.expert_list_car_details(p_ids text[])
RETURNS TABLE(
  id text, marque text, modele text, annee int, kilometrage int,
  vendeur_id uuid, vendeur_nom text,
  body_type text, transmission text, carburant text,
  couleur_exterieur text, couleur_interieur text,
  images jsonb, expert_images jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'expert') AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Réservé aux experts';
  END IF;
  RETURN QUERY
    SELECT c.id, c.marque, c.modele, c.annee, c.kilometrage, c.vendeur_id, c.vendeur_nom,
           c.body_type, c.transmission, c.carburant,
           c.couleur_exterieur, c.couleur_interieur,
           c.images, c.expert_images
    FROM public.cars c
    WHERE c.id = ANY(p_ids)
      AND (
        public.has_role(auth.uid(),'admin')
        OR EXISTS (SELECT 1 FROM public.expert_assignments ea
                   WHERE ea.car_id = c.id AND ea.expert_id = auth.uid())
      );
END $$;
REVOKE EXECUTE ON FUNCTION public.expert_list_car_details(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.expert_list_car_details(text[]) TO authenticated;
