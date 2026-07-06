-- Price model simplification: prix_attendu and prix_plancher represented the
-- same concept (the car's reference/expected price) with two names — merge
-- them into prix_plancher and drop prix_attendu. prix_minimum keeps its
-- existing role as the auction starting price (already how it's used in
-- admin.encheres.tsx's MultiCarEventDialog: startingPrice = prixMinimum).
--
-- prix_plancher was nullable (admin-set later); prix_attendu was NOT NULL
-- DEFAULT 0 (seller-set at submission). Since prix_plancher now inherits
-- prix_attendu's role as the always-present reference price, it inherits
-- its NOT NULL DEFAULT 0 contract too.

UPDATE public.cars SET prix_plancher = COALESCE(prix_plancher, prix_attendu);
ALTER TABLE public.cars ALTER COLUMN prix_plancher SET DEFAULT 0;
ALTER TABLE public.cars ALTER COLUMN prix_plancher SET NOT NULL;

-- admin_list_pending_validations() returned prix_attendu for the
-- final-price-vs-expected validation-tier comparison — repoint to
-- prix_plancher (same underlying value now). CREATE OR REPLACE can't rename
-- an OUT parameter (changes the function's row type), so drop it first.
DROP FUNCTION IF EXISTS public.admin_list_pending_validations();
CREATE FUNCTION public.admin_list_pending_validations()
RETURNS TABLE(
  id text, car_id text, current_price numeric, ends_at timestamp with time zone,
  top_bidder_id uuid, updated_at timestamp with time zone, closed_at timestamp with time zone,
  admin_validation_deadline timestamp with time zone,
  marque text, modele text, annee integer, vendeur_nom text, prix_plancher numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs';
  END IF;
  RETURN QUERY
    SELECT a.id, a.car_id, a.current_price::numeric, a.ends_at,
           a.top_bidder_id, a.updated_at, a.closed_at,
           a.admin_validation_deadline,
           c.marque, c.modele, c.annee, c.vendeur_nom, c.prix_plancher::numeric
    FROM public.auctions a
    JOIN public.cars c ON c.id = a.car_id
    WHERE a.status = 'closed'
    ORDER BY a.admin_validation_deadline ASC;
END $function$;
REVOKE EXECUTE ON FUNCTION public.admin_list_pending_validations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_pending_validations() TO authenticated;

ALTER TABLE public.cars DROP COLUMN prix_attendu;

-- Re-scope column-level SELECT grants: prix_plancher takes over prix_attendu's
-- public-facing role (buyer/seller listings, price-tier coloring). Column
-- lists otherwise unchanged from the last re-harden (20260704220610).
REVOKE SELECT ON public.cars FROM anon, authenticated;
GRANT SELECT (
  id, type, marque, modele, finition, transmission, carburant,
  annee, kilometrage, couleur_exterieur, couleur_interieur,
  note_expert, nombre_cles, puissance_fiscale, carte_grise_barree,
  procuration, date_vente, status, images, body_type, prix_plancher,
  payment_status, delivery_status, created_at, updated_at
) ON public.cars TO authenticated;
GRANT SELECT (
  id, type, marque, modele, finition, transmission, carburant,
  annee, kilometrage, couleur_exterieur, couleur_interieur,
  note_expert, nombre_cles, puissance_fiscale, carte_grise_barree,
  procuration, date_vente, status, images, body_type, prix_plancher,
  payment_status, delivery_status, main_levee, opposition,
  created_at, updated_at
) ON public.cars TO anon;
