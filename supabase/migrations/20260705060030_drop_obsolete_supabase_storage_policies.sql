-- Remove obsolete Supabase Storage RLS policies/helper functions.
--
-- The app no longer calls supabase.storage.* (see src/lib/storage/providers/
-- localFilesystemStorage.ts) — all uploads/downloads now go through the
-- app's own /api/storage/* routes onto a local filesystem volume. The
-- storage.objects policies below governed the OLD Storage-API-mediated
-- access path and are dead weight now. Left in place: the "storage" and
-- "imgproxy" Supabase Storage API containers and the storage.buckets rows
-- seeded by docker/migrate/run.sh — harmless if unused, and removing them
-- is unnecessary since nothing references them anymore.
DROP POLICY IF EXISTS car_images_insert_owner_or_admin ON storage.objects;
DROP POLICY IF EXISTS car_images_update_own ON storage.objects;
DROP POLICY IF EXISTS car_images_delete_own ON storage.objects;
DROP POLICY IF EXISTS payment_proofs_buyer_insert_own ON storage.objects;
DROP POLICY IF EXISTS payment_proofs_buyer_insert_auction ON storage.objects;
DROP POLICY IF EXISTS payment_proofs_buyer_read_own ON storage.objects;

DROP FUNCTION IF EXISTS public.storage_can_write_car_image(text);
DROP FUNCTION IF EXISTS public.storage_can_write_payment_proof_auction(text);
DROP FUNCTION IF EXISTS public.storage_can_write_payment_proof_caution(text);
DROP FUNCTION IF EXISTS public.storage_can_write_payment_proof_car_payment(text);
