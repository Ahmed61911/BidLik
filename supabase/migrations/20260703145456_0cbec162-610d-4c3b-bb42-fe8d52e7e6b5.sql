
-- Helper functions (SECURITY DEFINER) so storage policies don't need direct table grants
CREATE OR REPLACE FUNCTION public.storage_can_write_car_image(p_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'admin')
    OR EXISTS (
      SELECT 1 FROM public.cars c
      WHERE c.id = split_part(p_name,'/',1)
        AND c.vendeur_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION public.storage_can_write_payment_proof_auction(p_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (auth.uid())::text = split_part(p_name,'/',1)
    AND EXISTS (
      SELECT 1 FROM public.auctions a
      WHERE a.top_bidder_id = auth.uid()
        AND a.status IN ('validated'::auction_status_t,'closed'::auction_status_t)
    );
$$;

GRANT EXECUTE ON FUNCTION public.storage_can_write_car_image(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.storage_can_write_payment_proof_auction(text) TO authenticated;

-- Recreate storage policies to use the helpers
DROP POLICY IF EXISTS car_images_insert_owner_or_admin ON storage.objects;
DROP POLICY IF EXISTS car_images_update_own ON storage.objects;
DROP POLICY IF EXISTS car_images_delete_own ON storage.objects;
DROP POLICY IF EXISTS payment_proofs_buyer_insert ON storage.objects;

CREATE POLICY car_images_insert_owner_or_admin ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'car-images' AND public.storage_can_write_car_image(name));

CREATE POLICY car_images_update_own ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'car-images' AND public.storage_can_write_car_image(name))
  WITH CHECK (bucket_id = 'car-images' AND public.storage_can_write_car_image(name));

CREATE POLICY car_images_delete_own ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'car-images' AND public.storage_can_write_car_image(name));

CREATE POLICY payment_proofs_buyer_insert_auction ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND public.storage_can_write_payment_proof_auction(name));
