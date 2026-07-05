
-- 1) CARS: restrict sensitive columns from authenticated
REVOKE SELECT ON public.cars FROM authenticated;
GRANT SELECT (
  id, vendeur_nom, type, marque, modele, finition, transmission, carburant,
  annee, kilometrage, couleur_exterieur, couleur_interieur, note_expert,
  nombre_cles, puissance_fiscale, carte_grise_barree, procuration,
  main_levee, images, status, prix_attendu, body_type, created_at, updated_at
) ON public.cars TO authenticated;

-- 2) AUCTIONS: hide top_bidder_id from authenticated
REVOKE SELECT ON public.auctions FROM authenticated;
GRANT SELECT (
  id, car_id, event_id, starts_at, ends_at, starting_price, current_price,
  bid_count, status, visibility, auction_type, closed_at,
  admin_validation_deadline, validated_at, payment_deadline,
  created_at, updated_at
) ON public.auctions TO authenticated;

-- 3) RPC: get_car_full — admin, owner, or assigned expert
CREATE OR REPLACE FUNCTION public.get_car_full(p_car_id text)
RETURNS public.cars
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.cars;
BEGIN
  SELECT * INTO v FROM public.cars WHERE id = p_car_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF public.has_role(auth.uid(),'admin')
     OR v.vendeur_id = auth.uid()
     OR EXISTS (SELECT 1 FROM public.expert_assignments ea
                WHERE ea.car_id = v.id AND ea.expert_id = auth.uid())
  THEN
    RETURN v;
  END IF;
  RAISE EXCEPTION 'Accès refusé';
END $$;
REVOKE EXECUTE ON FUNCTION public.get_car_full(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_car_full(text) TO authenticated;

-- 4) RPC: list_my_seller_cars — vendeur's own
CREATE OR REPLACE FUNCTION public.list_my_seller_cars()
RETURNS SETOF public.cars
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.cars
  WHERE vendeur_id = auth.uid()
  ORDER BY created_at DESC;
$$;
REVOKE EXECUTE ON FUNCTION public.list_my_seller_cars() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_seller_cars() TO authenticated;

-- 5) RPC: admin_list_cars
CREATE OR REPLACE FUNCTION public.admin_list_cars()
RETURNS SETOF public.cars
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs';
  END IF;
  RETURN QUERY SELECT * FROM public.cars ORDER BY created_at DESC;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_list_cars() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_cars() TO authenticated;

-- 6) RPC: admin_list_cars_by_ids
CREATE OR REPLACE FUNCTION public.admin_list_cars_by_ids(p_ids text[])
RETURNS SETOF public.cars
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs';
  END IF;
  RETURN QUERY SELECT * FROM public.cars WHERE id = ANY(p_ids);
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_list_cars_by_ids(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_cars_by_ids(text[]) TO authenticated;

-- 7) RPC: admin_list_expertise_ready
CREATE OR REPLACE FUNCTION public.admin_list_expertise_ready()
RETURNS TABLE(car public.cars, note_finale int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs';
  END IF;
  RETURN QUERY
    SELECT c, ea.note_finale
    FROM public.expert_assignments ea
    JOIN public.cars c ON c.id = ea.car_id
    WHERE ea.status = 'rapport_recu' AND c.status = 'open';
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_list_expertise_ready() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_expertise_ready() TO authenticated;

-- 8) RPC: expert_list_car_details — for assigned expert
CREATE OR REPLACE FUNCTION public.expert_list_car_details(p_ids text[])
RETURNS TABLE(id text, marque text, modele text, annee int, kilometrage int, vendeur_id uuid, vendeur_nom text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'expert') AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Réservé aux experts';
  END IF;
  RETURN QUERY
    SELECT c.id, c.marque, c.modele, c.annee, c.kilometrage, c.vendeur_id, c.vendeur_nom
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

-- 9) RPC: admin_list_auctions (full row)
CREATE OR REPLACE FUNCTION public.admin_list_auctions()
RETURNS SETOF public.auctions
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs';
  END IF;
  RETURN QUERY SELECT * FROM public.auctions ORDER BY created_at DESC;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_list_auctions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_auctions() TO authenticated;

-- 10) RPC: seller_list_my_car_auctions — vendeur sees full auction rows for own cars
CREATE OR REPLACE FUNCTION public.seller_list_my_car_auctions()
RETURNS SETOF public.auctions
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.* FROM public.auctions a
  JOIN public.cars c ON c.id = a.car_id
  WHERE c.vendeur_id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.seller_list_my_car_auctions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seller_list_my_car_auctions() TO authenticated;

-- 11) RPC: am_i_top_bidder / my_leading_auctions
CREATE OR REPLACE FUNCTION public.am_i_top_bidder(p_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.auctions
                 WHERE id = p_id AND top_bidder_id = auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.am_i_top_bidder(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.am_i_top_bidder(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.my_leading_auctions(p_ids text[])
RETURNS TABLE(auction_id text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.auctions
  WHERE id = ANY(p_ids) AND top_bidder_id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.my_leading_auctions(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_leading_auctions(text[]) TO authenticated;

-- 12) STORAGE: fix car_images_update_own to verify via cars table
DROP POLICY IF EXISTS car_images_update_own ON storage.objects;
CREATE POLICY car_images_update_own ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'car-images' AND (
      public.has_role(auth.uid(),'admin') OR EXISTS (
        SELECT 1 FROM public.cars c
        WHERE c.id = split_part(objects.name, '/', 1)
          AND c.vendeur_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    bucket_id = 'car-images' AND (
      public.has_role(auth.uid(),'admin') OR EXISTS (
        SELECT 1 FROM public.cars c
        WHERE c.id = split_part(objects.name, '/', 1)
          AND c.vendeur_id = auth.uid()
      )
    )
  );

-- Same fix for delete: don't rely on storage owner alone
DROP POLICY IF EXISTS car_images_delete_own ON storage.objects;
CREATE POLICY car_images_delete_own ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'car-images' AND (
      public.has_role(auth.uid(),'admin') OR EXISTS (
        SELECT 1 FROM public.cars c
        WHERE c.id = split_part(objects.name, '/', 1)
          AND c.vendeur_id = auth.uid()
      )
    )
  );

-- 13) Revoke EXECUTE on internal/trigger-only SECURITY DEFINER fns from authenticated
REVOKE EXECUTE ON FUNCTION public.tick_auctions() FROM authenticated, anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_my_account_active() FROM authenticated, anon, PUBLIC;
