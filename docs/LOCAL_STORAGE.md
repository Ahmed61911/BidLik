# Local filesystem storage (replaces Supabase Storage)

BidLik no longer depends on the Supabase Storage API for file uploads.
Uploaded files (car photos, expertise reports, payment proofs, identity
documents, avatars) live on a local filesystem volume instead, served by the
app's own `/api/storage/*` routes. Supabase Auth, Postgres, PostgREST and
Realtime are unaffected — only the storage layer changed.

## Why

Supabase Storage (the `storage`/`imgproxy` containers) is one more moving
part to run and back up on a single OVH VPS. Files now live in a plain
directory tree that's trivial to `rsync`/snapshot, and Postgres only ever
holds metadata about them — never binary content.

## Architecture

```
Browser                     App server (TanStack Start)              Disk
───────                     ──────────────────────────              ────
storage.uploadFile() ──────▶ POST /api/storage/upload  ──────────▶ STORAGE_ROOT/{bucket}/{path}
storage.signedUrl()  ──────▶ POST /api/storage/signed-url
                              (checks authorization, mints a
                               short-lived HMAC token)
<img src / <a href>  ──────▶ GET  /api/storage/download?token=…  ◀── streams the file
                              (verifies the token only — the real
                               authorization check already happened
                               when the token was minted)
<img src> (public)    ──────▶ GET  /api/storage/public?bucket=…&path=…
                              (car-images/commercial only — no auth,
                               long Cache-Control, stable URL)
```

The frontend never talks to the filesystem or to Postgres metadata directly
— it only ever calls `storage.uploadFile()` / `storage.signedUrl()` /
`storage.remove()` from `src/lib/storage`, exactly as it did when the
provider was Supabase Storage. That abstraction (`StorageProvider` in
`src/lib/storage/types.ts`) was already designed for this swap; only a new
`LocalFilesystemStorageProvider` was added and swapped in — no call sites
needed to change their calling convention (they only needed a new required
`category` field — see "Modified files").

### Directory layout (under `STORAGE_ROOT`)

```
/cars/{carId}/commercial/{uuid}.ext   — public, uploaded by the expert
/cars/{carId}/expertise/{uuid}.ext    — private
/cars/{carId}/reports/{uuid}.ext      — private
/payment-proofs/{userId}/{uuid}.ext   — private
/identity/{userId}/{uuid}.ext         — private (no UI wired up yet — see below)
/avatars/{uuid}.ext                   — private by default (see assumption below)
```

Files belong to the **Car**, never to the Auction — an auction only ever
references an existing car's id. Deleting/updating an auction never touches
`cars.*` files. Payment proofs belong to the **User** who uploaded them
(`car_id` is still recorded as metadata for display, but never used for
authorization or physical placement).

Every stored filename is a fresh `crypto.randomUUID()` plus the original
extension — original filenames are preserved only as metadata
(`storage_files.original_filename`), never used on disk.

### Database

New table `public.storage_files` (migration
`supabase/migrations/20260705060000_local_filesystem_storage_metadata.sql`):
`owner`, `car_id`, `bucket`, `file_category`, `original_filename`,
`stored_filename`, `relative_path` (unique), `mime_type`, `file_size`,
`upload_date`. Locked to `service_role` only — the frontend never queries it
directly. No existing table's schema changed; `cars.images`,
`payments.proof_url`, `expert_assignments.rapport_url` etc. keep the exact
same columns, they just now hold local storage paths instead of Supabase
Storage paths (or, for `expert_images`/`rapport_url`, instead of base64 data
URLs — see below).

A second migration
(`20260705060030_drop_obsolete_supabase_storage_policies.sql`) removes the
now-dead `storage.objects` RLS policies and `storage_can_write_*` helper
functions. The `storage`/`imgproxy` containers and the `storage.buckets`
rows seeded by `docker/migrate/run.sh` are left alone — harmless if unused,
and removing them isn't necessary.

### Authorization

Re-implemented in TypeScript (`src/lib/storage/server/authorize.server.ts`),
mirroring the old `storage_can_write_*` SQL functions:

| Category | Write | Read |
|---|---|---|
| commercial | admin, car owner (vendeur), or assigned expert | public, no auth |
| expertise | admin, car owner, or assigned expert | admin, car owner, assigned expert, or **any user with the `acheteur` role** (matches the existing `canPreviewPhotos = isAdmin \|\| isAcheteur` gate on the auction detail page) |
| report | admin, car owner, or assigned expert | admin, car owner, assigned expert, or the auction's winning buyer |
| caution / car-payment / admin-refund / admin-generic | the target user, or admin | the target user, or admin |
| identity | the target user, or admin | the target user, or admin |
| avatar | any authenticated user (their own) | **assumed private** (owner or admin only) — the spec didn't list avatars under either Public or Private; there's no avatar-upload UI in the app today, so this default was picked conservatively. Flip `PUBLIC_CATEGORIES` in `src/lib/storage/validation.ts` if you want avatars public. |

This is a genuine **security hardening**, not just a like-for-like port: the
old `storage.objects` policy for `car-images` reads was
`bucket_id = 'car-images'` with no ownership check at all (any authenticated
user could read any car-images object via signed URL). The new backend
enforces the real per-category rules above.

## Modified files

**New:**
- `supabase/migrations/20260705060000_local_filesystem_storage_metadata.sql` — `storage_files` table
- `supabase/migrations/20260705060030_drop_obsolete_supabase_storage_policies.sql` — cleanup
- `supabase/migrations/20260705060100_allow_expert_update_car_images.sql` — fixes a pre-existing RLS gap: `cars_update_owner_or_admin` never allowed the assigned expert to write `cars.images`/`cars.expert_images`, only the vendeur/admin — silently swallowed (no error checked) since this write path was previously dead code. Adds an `is_assigned_expert()` helper and extends the policy. Verified via direct `SET ROLE authenticated` tests: the assigned expert can now write, an unrelated user still cannot.
- `src/lib/storage/server/fs.server.ts` — filesystem I/O, path traversal guards
- `src/lib/storage/server/authorize.server.ts` — read/write authorization
- `src/lib/storage/server/signing.server.ts` — HMAC signed download tokens
- `src/lib/storage/server/limits.server.ts` — env-overridable size limits
- `src/lib/storage/providers/localFilesystemStorage.ts` — the new `StorageProvider`
- `src/lib/storage/validation.ts` — allowed MIME types / size / public-category table
- `src/routes/api/storage/upload.ts`, `signed-url.ts`, `download.ts`, `public.ts`, `remove.ts`
- `docker/migrate/migrate-storage-to-local.cjs` — one-time data migration script
- `docker/local-storage/` — host-dev storage root (gitignored/dockerignored)

**Changed:**
- `src/lib/storage/index.ts` — swapped provider, added `category`/`carId` to `UploadFileInput`
- `src/lib/storage/types.ts` — added `FileCategory`, `identity`/`avatars` buckets
- `src/lib/storage/paths.ts` — UUID filenames, flattened payment-proofs to `{userId}/…`, added `publicUrl()`/`parseCarIdFromPath()`/`parseUserIdFromPath()`
- `src/lib/carImages.ts` — added `resolveCarImageUrl()` (storage path → URL, or pass through static placeholder URLs unchanged)
- `src/lib/supabaseAcheteurStore.ts` — `uploadBuyerProof` uses new `paymentPaths.carPayment(userId, ext)` signature
- `src/lib/supabaseAdminPaiements.ts` — `uploadProof()` now takes a target `userId`
- `src/lib/supabaseExpertApi.ts` — `submitReport()` writes storage paths (not base64) to `expert_images`/`rapport_url`; writes `commercialImages` to `cars.images`; both `cars` update calls now check `{ error }` instead of swallowing failures silently (how the RLS gap above went unnoticed)
- `src/routes/expert.inspections.$inspectionId.tsx` — uploads photos/PDF immediately via `storage.uploadFile()` instead of `FileReader.readAsDataURL()`; also **wires up the previously-dead "Photos commerciales" submission** (the UI already collected these but never sent them anywhere — necessary to actually exercise the "commercial photos" storage category end to end)
- `src/routes/admin.paiements.tsx`, `admin.cautions.tsx` — pass `userId` to `uploadProof()`
- `src/routes/admin.voitures.tsx`, `auctions.$auctionId.tsx`, `acheteur.gagnees.$auctionId.tsx`, `acheteur.encherir.$auctionId.tsx`, `vehicules.tsx` — resolve storage paths to displayable URLs (`resolveCarImageUrl()` for public commercial photos, `storage.signedUrl()` for private expertise photos/reports)
- `src/components/AuctionCard.tsx`, `src/components/LotCard.tsx` — same, for listing thumbnails
- `src/types/expert.ts` — `ExpertReport.rapportPdfDataUrl` → `rapportPath`, added `commercialImages`
- `Dockerfile` — multi-stage: `dev` (unchanged behavior) and new `prod` (real Node build for the VPS)
- `vite.config.ts` — Nitro preset overridden to `node-server` (needs real filesystem access; only takes effect outside the Lovable sandbox)
- `docker/docker-compose.yml` — `app` service: explicit `target: dev`, new `storage-files` volume mounted at `/storage`, `STORAGE_ROOT`/`STORAGE_SIGNING_SECRET` env vars
- `docker/gen-keys.cjs` — also generates `STORAGE_SIGNING_SECRET`
- `docker/.env.example`, `docker/.env`, `.env` (root) — new storage env vars
- `.dockerignore` — excludes `docker/local-storage`

**Removed:**
- `src/lib/storage/providers/supabaseStorage.ts` — the old `SupabaseStorageProvider`

## Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `STORAGE_ROOT` | app server | Root directory for all uploaded files. `/storage` inside the Docker `app` service (backed by the `storage-files` volume); a real host path (e.g. `./docker/local-storage`) when running `bun run dev` directly. |
| `STORAGE_SIGNING_SECRET` | app server | HMAC secret for signed download tokens. Generate with `node docker/gen-keys.cjs`. Never reuse `JWT_SECRET` for this. |
| `STORAGE_MAX_IMAGE_BYTES` | app server, optional | Overrides the default 10 MB limit for commercial/expertise/avatar images. |
| `STORAGE_MAX_DOCUMENT_BYTES` | app server, optional | Overrides the default 8 MB limit for reports/payment-proofs/identity docs (images or PDF). |

## Docker changes

- `docker-compose.yml`'s `app` service now mounts a named volume
  `storage-files:/storage` and sets `STORAGE_ROOT=/storage` — uploads
  survive `docker compose down`/`up`, image rebuilds, and redeploys, and are
  never baked into the image.
- `Dockerfile` gained a `prod` build target for the OVH VPS: `bun run build`
  (now targeting Nitro's `node-server` preset instead of Cloudflare Workers)
  then `bun run .output/server/index.mjs`. Build it with
  `docker build --target prod -t bidlik-app:prod .` from the repo root.
- The local dev compose still uses `target: dev` (`bun run dev`) —
  unaffected in day-to-day use.
- The `storage`/`imgproxy` Supabase containers keep running for parity but
  are no longer read by the app — remove them from a trimmed production
  compose if you want a smaller footprint (not done here, to avoid touching
  a working local dev setup).

## Migrating existing files out of Supabase Storage

Only relevant if you have a deployment where real files were already
uploaded to the `car-images`/`payment-proofs` buckets (this project's own
dev database does not — commercial photo upload was never wired up before
this change, and expertise photos/reports were stored as base64, not real
Storage objects).

```bash
cd docker
SUPABASE_URL=http://localhost:8000 \
SUPABASE_SERVICE_ROLE_KEY=<your service role key> \
STORAGE_ROOT=./local-storage \
node migrate/migrate-storage-to-local.cjs
```

This downloads every object from both buckets and writes it to
`STORAGE_ROOT/{bucket}/{same relative path}`, plus a best-effort
`storage_files` metadata row — no changes needed to `cars.images` /
`payments.proof_url`, since the path string stays identical. See the
script's header comment for the one caveat around old-style payment-proof
paths and write-authorization.

## Assumptions flagged

- **Avatars are private by default.** The spec's Public/Private list didn't
  mention avatars, and there's no avatar-upload UI in the app yet. Change
  `PUBLIC_CATEGORIES` in `src/lib/storage/validation.ts` if you want them
  public.
- **Identity documents have backend support but no UI.** There's no
  identity-verification feature in the app today (no table, no route). The
  storage layer supports the `identity` bucket/category per the spec's
  required directory structure, but nothing uploads to it yet.
- **Expertise photo read access was widened to match existing behavior**,
  not narrowed to "just the car owner/expert/admin" — the auction detail
  page already showed expertise photos to any `acheteur`-role user before
  this migration (`canPreviewPhotos = isAdmin || isAcheteur`); the new
  backend authorization preserves that, rather than silently breaking it.

## Testing checklist

- [ ] **Uploads**: expert can upload inspection photos, commercial photos,
      and a PDF report from `/expert/inspections/{id}`; buyer can upload a
      caution proof from `/acheteur/caution-paiement`; buyer can upload a
      payment proof after winning an auction; admin can upload a refund
      proof from `/admin/cautions` and a generic proof from `/admin/paiements`.
- [ ] **Validation**: uploading a `.exe` or oversized file is rejected with
      a clear error, for each of the categories above.
- [ ] **Public read**: a car's commercial photos render on `/vehicules`,
      `/auctions/{id}`, `/acheteur/encherir/{id}` without being logged in.
- [ ] **Private read — authorized**: logged in as the assigned expert,
      the car's owner (vendeur), or an admin, expertise photos and the
      report render/download on `/admin/voitures` and the report on
      `/acheteur/gagnees/{id}` (winning buyer).
- [ ] **Private read — unauthorized**: a *different* buyer (not the winner,
      no `acheteur` role bypass applicable) cannot fetch another user's
      payment proof or another car's report by guessing/reusing a URL —
      confirm `/api/storage/signed-url` returns 403 for them.
- [ ] **Expired/invalid token**: hitting `/api/storage/download` with a
      tampered or expired token returns 403, not the file.
- [ ] **Deletion**: admin removing a payment proof (`admin.paiements.tsx`)
      actually deletes the file from disk and the `storage_files` row.
- [ ] **Car/auction lifecycle**: deleting an auction does not delete the
      car's files; the car's `images`/expertise data are unaffected.
- [ ] **Docker**: `docker compose down && docker compose up -d` (no `-v`)
      preserves previously uploaded files — the `storage-files` volume
      survives container recreation.
- [ ] **Production build**: `docker build --target prod .` completes and
      the resulting image serves the app and `/api/storage/*` routes with
      real filesystem access (not attempted against Cloudflare Workers).
