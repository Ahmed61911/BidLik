-- ============================================================================
-- "Mes voitures gagnées" (won auctions) buyer feature — merged in from a
-- parallel editing session on the hosted Lovable project (bidlik-insight-lab),
-- reconciled with this local self-hosting migration branch.
--
-- Two new SECURITY DEFINER RPCs, both scoped to the caller's own wins via
-- top_bidder_id = auth.uid() / an explicit ownership check — no raw table
-- grants are required for either, since everything the frontend needs comes
-- back through these functions.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.list_my_won_auctions()
RETURNS TABLE(
  auction_id text,
  car_id text,
  marque text,
  modele text,
  annee integer,
  prix_final numeric,
  auction_status public.auction_status_t,
  car_status public.car_status,
  payment_status public.payment_status_t,
  delivery_status public.delivery_status_t,
  validated_at timestamptz,
  payment_deadline timestamptz,
  closed_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    a.id, a.car_id, c.marque, c.modele, c.annee,
    a.current_price::numeric, a.status, c.status, c.payment_status, c.delivery_status,
    a.validated_at, a.payment_deadline, a.closed_at, a.updated_at
  FROM public.auctions a
  JOIN public.cars c ON c.id = a.car_id
  WHERE a.top_bidder_id = auth.uid()
    AND a.status IN ('closed','validated','cancelled')
  ORDER BY a.updated_at DESC;
$$;
REVOKE ALL ON FUNCTION public.list_my_won_auctions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_my_won_auctions() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_won_car_details(p_auction_id text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_auction public.auctions;
  v_car public.cars;
BEGIN
  SELECT * INTO v_auction FROM public.auctions WHERE id = p_auction_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Enchère introuvable'; END IF;
  IF v_auction.top_bidder_id IS DISTINCT FROM auth.uid()
     AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  SELECT * INTO v_car FROM public.cars WHERE id = v_auction.car_id;

  RETURN jsonb_build_object(
    'auction', jsonb_build_object(
      'id', v_auction.id,
      'status', v_auction.status,
      'current_price', v_auction.current_price,
      'starting_price', v_auction.starting_price,
      'starts_at', v_auction.starts_at,
      'ends_at', v_auction.ends_at,
      'closed_at', v_auction.closed_at,
      'validated_at', v_auction.validated_at,
      'payment_deadline', v_auction.payment_deadline,
      'bid_count', v_auction.bid_count,
      'auction_type', v_auction.auction_type,
      'visibility', v_auction.visibility
    ),
    'car', jsonb_build_object(
      'id', v_car.id,
      'marque', v_car.marque,
      'modele', v_car.modele,
      'annee', v_car.annee,
      'finition', v_car.finition,
      'kilometrage', v_car.kilometrage,
      'transmission', v_car.transmission,
      'carburant', v_car.carburant,
      'couleur_exterieur', v_car.couleur_exterieur,
      'couleur_interieur', v_car.couleur_interieur,
      'puissance_fiscale', v_car.puissance_fiscale,
      'nombre_cles', v_car.nombre_cles,
      'procuration', v_car.procuration,
      'body_type', v_car.body_type,
      'note_expert', v_car.note_expert,
      'status', v_car.status,
      'payment_status', v_car.payment_status,
      'delivery_status', v_car.delivery_status,
      'images', v_car.images,
      'expert_images', v_car.expert_images,
      'vendeur_nom', v_car.vendeur_nom
    )
  );
END $$;

-- Function's own body already rejects any non-owner/non-admin caller
-- (including anon, whose auth.uid() is always null) with 'Accès refusé', so
-- granting anon EXECUTE too is harmless — matches the final grant state from
-- the upstream session and avoids a pointless divergence.
REVOKE ALL ON FUNCTION public.get_my_won_car_details(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_won_car_details(text) TO authenticated, anon;
