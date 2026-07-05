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
    a.current_price, a.status, c.status, c.payment_status, c.delivery_status,
    a.validated_at, a.payment_deadline, a.closed_at, a.updated_at
  FROM public.auctions a
  JOIN public.cars c ON c.id = a.car_id
  WHERE a.top_bidder_id = auth.uid()
    AND a.status IN ('closed','validated','cancelled')
  ORDER BY a.updated_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.list_my_won_auctions() TO authenticated;