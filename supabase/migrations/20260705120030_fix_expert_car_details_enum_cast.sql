-- Fix 20260705120000: cars.transmission/carburant are enum types
-- (transmission_t/carburant_t), but the function declares them as plain
-- text in RETURNS TABLE — Postgres requires an exact type match in
-- RETURN QUERY, not just an implicit-cast-compatible one. Caught via a
-- direct SET ROLE authenticated test: "structure of query does not match
-- function result type... Returned type transmission_t does not match
-- expected type text".
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
           c.body_type, c.transmission::text, c.carburant::text,
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
