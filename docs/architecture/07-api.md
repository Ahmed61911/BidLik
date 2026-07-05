# 07 — API Reference

Two API surfaces:

1. **Supabase Data API** — anything under `/rest/v1/*` (PostgREST tables +
   RPCs). Called from the browser via `supabase-js`.
2. **App server routes** — TSS `server.handlers` under
   `/api/public/*`. Called by the frontend or by CMI.

Every response is JSON unless noted.

## App server routes (`src/routes/api/public/*`)

### `POST /api/public/seed-demo`
- **Purpose**: Idempotent bootstrap of the 4 demo accounts.
- **Auth**: none — self-contained bootstrap, safe because it only creates
  the fixed demo emails (`admin@bidlik.ma`, …).
- **Input**: none.
- **Logic**: `supabaseAdmin.auth.admin.listUsers()` → for each demo:
  create (`email_confirm:true`, `user_metadata: { nom, telephone, role, actif:true }`)
  or update (reset password + metadata) → upsert `profiles` + `user_roles`.
- **Response**: `{ ok: true }` or `{ ok: false, error }`.
- **Files**: `src/routes/api/public/seed-demo.ts`,
  `src/integrations/supabase/client.server.ts`.

### `POST /api/public/admin-create-user`
- **Auth**: Bearer JWT → verified via `supabaseAdmin.auth.getUser(token)`;
  caller must have `admin` role (via `has_role` RPC).
- **Input** (Zod): `{ email, password, nom, role: "acheteur|vendeur|expert|admin", telephone? }`.
- **Logic**: `supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata })` → trigger populates profile & role.
- **Errors**: 401 unauthenticated, 403 non-admin, 400 Zod, 500 GoTrue.
- **Files**: `src/routes/api/public/admin-create-user.ts`, `src/integrations/supabase/client.server.ts`.

### `POST /api/public/admin-delete-user`
- Same admin gate. Input `{ userId }`. Calls `auth.admin.deleteUser`; `ON DELETE CASCADE` cleans `profiles`, `user_roles`.

### `POST /api/public/cmi-init`
- **Auth**: Bearer JWT (buyer).
- **Input** (Zod): `{ type: "caution", amount: 100..1_000_000 }`.
- **Response**: `{ ok, action: gatewayUrl, fields: { clientid, storetype, TranType, amount, currency:"504", oid, okUrl, failUrl, callbackUrl, shopurl, lang:"fr", rnd, encoding, refreshtime, email, BillToName, BillToCity, BillToCountry:"504", tel, hash } }` — client auto-submits an HTML form.
- **Side effects**: inserts a pending `payments` row (`status='en_attente'`, `reference=oid`).
- **Files**: `src/routes/api/public/cmi-init.ts`, `src/lib/cmi.ts`.

### `POST /api/public/cmi-callback`
- **Auth**: HMAC hash from CMI verified via `verifyCmiCallback`.
- **Input**: form-urlencoded body from CMI.
- **Logic**: parse → verify hash → find `payments` row by `reference=oid` → set `status=paye|annule`; on success + `type='caution'`, set `profiles.caution_validee=true`.
- **Response**: `APPROVED` or `FAILURE` (text/plain, 200).

## Supabase Data API (via PostgREST + Kong)

Tables (all under `/rest/v1/<table>`; standard PostgREST verbs — `GET`,
`POST`, `PATCH`, `DELETE`; filters via query string; RLS enforced):

| Table | Read | Write | Notes |
|-------|------|-------|-------|
| `auctions` | anon + auth | admin only (buyers use RPCs) | Sensitive columns hidden via column GRANT. |
| `bids` | own + admin | **blocked** (`bids_block_direct_writes`); use `place_bid` | `list_auction_bids` for public read. |
| `offers` | own + admin | **blocked**; use `submit_offer` | UNIQUE `(auction_id, user_id)`. |
| `cars` | anon + auth (columns filtered) | seller or admin | |
| `auction_events` | public | admin | |
| `profiles` | own + admin | own (INSERT/UPDATE) | Use `get_my_profile()` for own PII. |
| `user_roles` | own + admin | admin only | |
| `payments` | own + admin | admin only (buyers use `buyer_submit_payment`) | |
| `notifications` | own | own (UPDATE for read/delete) | |
| `expert_assignments` | admin/assignee | admin | |

### RPCs (`POST /rest/v1/rpc/<name>` with JSON body)

| RPC | Input | Returns | Called by |
|-----|-------|---------|-----------|
| `has_role(_user_id, _role)` | uuid, app_role | bool | `admin-create-user.ts`, `admin-delete-user.ts` |
| `get_my_profile()` | – | row | `auth.ts` |
| `is_my_account_active()` | – | bool | (unused today) |
| `place_bid(p_auction_id, p_amount, p_is_auto?)` | text, int, bool | bids row | `acheteur.encherir.$auctionId.tsx` → `supabaseApi.placeBid` |
| `submit_offer(p_auction_id, p_amount)` | text, int | offers row | `SealedBidPanel.tsx` → `supabaseApi.submitOffer` |
| `list_auction_bids(p_auction_id)` | text | rows | `auctions.$auctionId.tsx` |
| `validate_auction(p_auction_id, p_decision)` | text, text | auctions row | `admin.validations.tsx` |
| `buyer_submit_payment(...)` | see fn | payments row | `acheteur.paiements.tsx` |
| `admin_upsert_payment(...)` / `admin_set_payment_status` / `admin_delete_payment` | ... | payments row / void | `admin.paiements.tsx` |
| `admin_list_payments()` | – | rows | `admin.paiements.tsx` |
| `admin_list_profiles / admin_get_profile / admin_list_pending_users / admin_set_user_active` | ... | rows / void | `admin.utilisateurs.tsx`, `admin.validations.tsx` |
| `assign_expert(p_car_id, p_expert_id)` | text, uuid | assignment row | `admin.experts.tsx` |
| `submit_expert_report(p_car_id, p_note)` | text, int(0..10) | assignment row | `expert.inspections.$id.tsx` |
| `tick_auctions()` | – | void | pg_cron (not exposed to clients) |

### Storage endpoints

Standard `storage-api` v1 through Kong `/storage/v1/*`:

- Upload: `POST /storage/v1/object/<bucket>/<path>` (buyer/seller only via
  RLS on `storage.objects`).
- Signed URL: `POST /storage/v1/object/sign/<bucket>/<path>` (short-lived
  URLs for gallery + payment-proof display).

Buckets: `car-images`, `payment-proofs` (both private).

### Realtime endpoint

`WSS /realtime/v1/websocket?apikey=...&vsn=1.0.0`. Channels:

- `postgres_changes` on `auctions` (filtered by id) and `bids` (filtered by
  `auction_id`) — see `src/lib/realtime.ts`.

## Files that build each response

| Endpoint | Route file | Service file | RPC / SQL |
|----------|------------|--------------|-----------|
| `POST /rpc/place_bid` | `acheteur.encherir.$auctionId.tsx` | `src/lib/supabaseApi.ts` `placeBid` | `place_bid()` |
| `POST /rpc/submit_offer` | `auctions.$auctionId.tsx` (`SealedBidPanel`) | `src/lib/supabaseApi.ts` `submitOffer` | `submit_offer()` |
| `GET /auctions?status=eq.live` | `auctions.index.tsx` | `src/lib/supabaseApi.ts` `listAuctions` | RLS `auctions_select_*` |
| `POST /rpc/validate_auction` | `admin.validations.tsx` | `src/lib/supabaseAdminApi.ts` | `validate_auction()` |
| `POST /api/public/cmi-init` | `acheteur.caution.tsx` | `src/lib/cmi.ts` | inserts `payments` |
| `POST /api/public/cmi-callback` | (CMI webhook) | `src/lib/cmi.ts` | updates `payments`, `profiles.caution_validee` |
