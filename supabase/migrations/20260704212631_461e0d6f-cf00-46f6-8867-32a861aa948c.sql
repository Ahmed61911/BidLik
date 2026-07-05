
CREATE OR REPLACE FUNCTION public.admin_list_pending_validations()
RETURNS TABLE(id text, car_id text, current_price numeric, ends_at timestamptz, top_bidder_id uuid, updated_at timestamptz, closed_at timestamptz, admin_validation_deadline timestamptz, marque text, modele text, annee integer, vendeur_nom text, prix_attendu numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs';
  END IF;
  RETURN QUERY
    SELECT a.id, a.car_id, a.current_price::numeric, a.ends_at,
           a.top_bidder_id, a.updated_at, a.closed_at,
           a.admin_validation_deadline,
           c.marque, c.modele, c.annee, c.vendeur_nom, c.prix_attendu::numeric
    FROM public.auctions a
    JOIN public.cars c ON c.id = a.car_id
    WHERE a.status = 'closed'
    ORDER BY a.admin_validation_deadline ASC;
END $$;

CREATE OR REPLACE FUNCTION public.admin_list_processed_validations()
RETURNS TABLE(id text, car_id text, current_price numeric, status auction_status_t, top_bidder_id uuid, validated_at timestamptz, updated_at timestamptz, payment_deadline timestamptz, marque text, modele text, annee integer, vendeur_nom text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs';
  END IF;
  RETURN QUERY
    SELECT a.id, a.car_id, a.current_price::numeric, a.status,
           a.top_bidder_id, a.validated_at, a.updated_at, a.payment_deadline,
           c.marque, c.modele, c.annee, c.vendeur_nom
    FROM public.auctions a
    JOIN public.cars c ON c.id = a.car_id
    WHERE a.status IN ('validated','cancelled')
    ORDER BY COALESCE(a.validated_at, a.updated_at) DESC;
END $$;
