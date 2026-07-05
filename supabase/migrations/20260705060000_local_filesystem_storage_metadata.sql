-- Local filesystem storage migration (replaces Supabase Storage).
--
-- Files now live on disk under STORAGE_ROOT (see docker-compose.yml's
-- "storage-files" volume), served by the app's own /api/storage/* routes
-- (src/routes/api/storage/*.ts). Postgres stores metadata only — never
-- binary content — in this table. All access is mediated by the backend
-- using the service_role client; no anon/authenticated grants are needed.
CREATE TABLE public.storage_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  car_id text REFERENCES public.cars(id) ON DELETE CASCADE,
  bucket text NOT NULL CHECK (bucket IN ('car-images', 'payment-proofs', 'identity', 'avatars')),
  file_category text NOT NULL CHECK (file_category IN (
    'commercial', 'expertise', 'report',
    'caution', 'car-payment', 'admin-refund', 'admin-generic',
    'identity', 'avatar'
  )),
  original_filename text NOT NULL,
  stored_filename text NOT NULL,
  relative_path text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  file_size bigint NOT NULL,
  upload_date timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_storage_files_owner ON public.storage_files(owner);
CREATE INDEX idx_storage_files_car ON public.storage_files(car_id);

-- Locked to service_role only: the frontend never queries this table
-- directly, it only ever talks to /api/storage/* which uses supabaseAdmin.
REVOKE ALL ON public.storage_files FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.storage_files TO service_role;
ALTER TABLE public.storage_files ENABLE ROW LEVEL SECURITY;
