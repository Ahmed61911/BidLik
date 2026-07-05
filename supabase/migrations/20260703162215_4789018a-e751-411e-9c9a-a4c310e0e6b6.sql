-- Storage RLS: accept new organized paths while keeping legacy paths readable
-- New layout:
--   payment-proofs/users/{uid}/caution/*
--   payment-proofs/cars/{carId}/payments/*
-- Legacy layout stays supported so existing files remain accessible.

CREATE OR REPLACE FUNCTION public.storage_can_write_payment_proof_caution(p_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND p_name LIKE 'users/' || (auth.uid())::text || '/caution/%';
$$;

CREATE OR REPLACE FUNCTION public.storage_can_write_payment_proof_car_payment(p_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND p_name LIKE 'cars/%/payments/%'
    AND EXISTS (
      SELECT 1 FROM public.auctions a
      WHERE a.top_bidder_id = auth.uid()
        AND a.car_id = split_part(p_name, '/', 2)
        AND a.status IN ('validated'::public.auction_status_t, 'closed'::public.auction_status_t)
    );
$$;

DROP POLICY IF EXISTS payment_proofs_buyer_insert_own ON storage.objects;
CREATE POLICY payment_proofs_buyer_insert_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-proofs' AND (
      (auth.uid())::text = split_part(name, '/', 1)
      OR public.storage_can_write_payment_proof_caution(name)
    )
  );

DROP POLICY IF EXISTS payment_proofs_buyer_insert_auction ON storage.objects;
CREATE POLICY payment_proofs_buyer_insert_auction ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-proofs' AND (
      public.storage_can_write_payment_proof_auction(name)
      OR public.storage_can_write_payment_proof_car_payment(name)
    )
  );

DROP POLICY IF EXISTS payment_proofs_buyer_read_own ON storage.objects;
CREATE POLICY payment_proofs_buyer_read_own ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'payment-proofs' AND (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR (auth.uid())::text = split_part(name, '/', 1)
      OR public.storage_can_write_payment_proof_caution(name)
      OR (
        name LIKE 'cars/%/payments/%' AND EXISTS (
          SELECT 1 FROM public.auctions a
          WHERE a.car_id = split_part(name, '/', 2)
            AND a.top_bidder_id = auth.uid()
        )
      )
    )
  );