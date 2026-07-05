
-- Restore Data API grants on public.cars. RLS still enforces row access.
-- Column-level SELECT for anon (public listings) excludes floor/expected prices and PII.
GRANT SELECT (
  id, type, body_type, marque, modele, finition, transmission, carburant,
  annee, kilometrage, couleur_exterieur, couleur_interieur, note_expert,
  nombre_cles, puissance_fiscale, images, status, payment_status, delivery_status,
  minimum_accepted_price, created_at, updated_at
) ON public.cars TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cars TO authenticated;
GRANT ALL ON public.cars TO service_role;
