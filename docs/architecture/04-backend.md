# 04 — Backend

## Two-tier "backend"

Bidlik has **no dedicated Node backend service**. The word "backend" spans
two very different runtimes:

1. **Postgres** — the real backend. All business logic lives in
   `SECURITY DEFINER` PL/pgSQL functions and RLS policies.
2. **The Bun/Vite (dev) or Cloudflare Worker (prod) server** — thin SSR +
   five TSS routes with the service-role key.

There are no `createServerFn` handlers that talk to Supabase. `src/start.ts`
still registers `attachSupabaseAuth` on `functionMiddleware` for future
server fns; today nothing uses it.

## `src/start.ts`

```ts
export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],  // adds Bearer for future createServerFn calls
  requestMiddleware:  [errorMiddleware],     // wraps every server request
}));
```

`errorMiddleware` runs every request; if any exception is not an
h3-shaped `{ statusCode }` object it renders `renderErrorPage()` from
`src/lib/error-page.ts` with HTTP 500.

## `src/server.ts` — SSR fetch handler

- Lazy-imports `@tanstack/react-start/server-entry` on the first request.
- Wraps the response in `normalizeCatastrophicSsrResponse`: h3 swallows
  in-handler throws into a `{"unhandled":true,"message":"HTTPError"}` JSON
  500 — this helper detects that shape and replaces the body with the
  static error page while logging the real error captured by
  `src/lib/error-capture.ts`.

## The five real backend endpoints

All under `src/routes/api/public/*`, using TanStack Router's
`server.handlers`. The `/api/public/*` prefix bypasses the platform's
published-site auth, so **each handler must authorise the caller itself**.

### `POST /api/public/seed-demo`

Idempotent bootstrap. On demand (called by the login page's demo
quick-fill), lists users via `supabase.auth.admin.listUsers()` and either
creates or updates each of the 4 demo accounts (`admin@bidlik.ma`,
`expert@bidlik.ma`, `vendeur@bidlik.ma`, `acheteur@bidlik.ma`) with
`email_confirm: true` and `user_metadata` (`nom`, `telephone`, `role`,
`actif: true`). The `handle_new_user` trigger on `auth.users` then
creates the matching row in `public.profiles` and `public.user_roles`.

### `POST /api/public/admin-create-user`

1. Reads `Authorization: Bearer <jwt>`.
2. Calls `supabaseAdmin.auth.getUser(token)` to verify the token.
3. Calls `supabase.rpc("has_role", { _user_id: userId, _role: "admin" })`
   to verify the caller is an admin.
4. Zod-validates `{ email, password, nom, role, telephone? }`.
5. `supabaseAdmin.auth.admin.createUser(...)` → the DB trigger fills
   `profiles`/`user_roles`.

### `POST /api/public/admin-delete-user`

Same admin gate, then `supabaseAdmin.auth.admin.deleteUser(userId)`.
`profiles.user_id → auth.users(id) ON DELETE CASCADE` removes the profile;
`user_roles` cascades too.

### `POST /api/public/cmi-init`

1. Verifies the buyer's bearer token.
2. Zod-validates `{ type: "caution", amount }`.
3. Loads profile fields.
4. Inserts a `payments` row with `status='en_attente'` and a generated
   `reference` = `CAU-<userIdPrefix>-<ts>`.
5. Builds the CMI hosted-form payload (`clientid`, `storetype=3D_PAY_HOSTING`,
   `TranType=PreAuth`, `amount`, `currency=504` MAD, `okUrl`/`failUrl`/
   `callbackUrl` derived from **server-trusted** `APP_ORIGIN`, French locale,
   caller profile info) and signs it with `computeCmiHash(fields, storeKey)`.
6. Returns `{ ok, action: gatewayUrl, fields }` — the client auto-submits
   an HTML form to the CMI gateway.

### `POST /api/public/cmi-callback`

Server-to-server webhook from CMI (form-urlencoded).

1. Parses the body (form data or `text/plain` fallback).
2. `verifyCmiCallback(body, storeKey)` — reconstructs the canonical string
   and compares SHA-512.
3. Success (`ProcReturnCode=00` + response `approved|success`) →
   updates `payments.status='paye'` and, when
   `payment.type='caution'`, sets `profiles.caution_validee=true`.
4. Failure → `payments.status='annule'`.
5. Returns `APPROVED` or `FAILURE` (200) as CMI expects.

## Middleware inventory

| Middleware | Where | What it does |
|------------|-------|--------------|
| `errorMiddleware` (`src/start.ts`) | Every server request | Catches non-h3 throws → 500 error page. |
| `attachSupabaseAuth` (`src/integrations/supabase/auth-attacher.ts`) | Every client-side `createServerFn` call | Reads current Supabase session and adds `Authorization: Bearer` — dormant today. |
| `requireSupabaseAuth` (`src/integrations/supabase/auth-middleware.ts`) | Available for future server fns | Validates the bearer and injects `{ supabase, userId, claims }` on `context`. |
| `THEME_BOOT_SCRIPT` (`src/lib/theme.ts`) | Inlined in `<head>` | Not real middleware but conceptually the same — sets `data-theme` pre-hydration. |

## Business logic layer (the PostgreSQL side)

See `05-database.md` for the full RPC catalogue. Highlights:

| Function | Purpose | Concurrency |
|----------|---------|-------------|
| `handle_new_user()` (trigger on `auth.users`) | Materialise `profiles` + `user_roles` from `raw_user_meta_data`. | Runs inside GoTrue's INSERT. |
| `has_role(uid, role)` | Central authorisation predicate; called by every RLS policy. | STABLE, SECURITY DEFINER, `search_path=public`. |
| `place_bid(auction_id, amount, is_auto?)` | Atomic bid submission with anti-snipe extension. | `SELECT ... FOR UPDATE` on `auctions`. |
| `submit_offer(auction_id, amount)` | Sealed-envelope UPSERT with per-user unique constraint. | `SELECT ... FOR UPDATE` on `auctions`. |
| `validate_auction(id, decision)` | Admin approves or cancels closed auction; sets payment deadline. | Admin-only via `has_role`. |
| `buyer_submit_payment(...)` | Buyer uploads proof for validated auction, notifies admins. | Winner-only, deadline-checked. |
| `assign_expert(car, expert)` / `submit_expert_report(car, note)` | Expert workflow. | Admin/Expert gates. |
| `admin_upsert_payment / admin_set_payment_status / admin_delete_payment / admin_list_*` | Admin CRUD around finance & users. | Admin gate. |
| `tick_auctions()` | Runs every 30 s via `pg_cron`; state-machine advancement. | `SECURITY DEFINER`, runs as `postgres`. |
| `list_auction_bids(id)` | Returns bidder names redacted to "Anonyme" for anyone but the bidder or admin. | Bypasses table RLS deliberately. |
| `get_my_profile()` | Returns the caller's own `telephone`/`email` (column GRANTs block cross-user reads). | Bound to `auth.uid()`. |
| `is_my_account_active()` | Returns `profiles.actif` for the caller — no longer enforced in login flow (see 06). | Kept for future use. |
| `notify_on_bid` (trigger on `bids`) | Notifies the previous top bidder when out-bid. |
| `notify_on_auction_status` (trigger on `auctions`) | Emits "won"/"lost" notifications on closure. |
| `stamp_auction_closure` (trigger on `auctions`) | Sets `closed_at` and `admin_validation_deadline = closed_at + 24h`. |
| `ensure_expert_assignment` (trigger on `cars`) | Auto-creates an expert-assignment row on new cars. |

## Request lifecycle for `/rest/v1/*` and `/rest/v1/rpc/*`

```
Browser fetch (supabase-js)
   │  Authorization: Bearer <user_jwt>
   │  apikey: <ANON_KEY>
   ▼
Kong :8000  → routes /rest/v1 → strip prefix → PostgREST :3000
   │
   ▼
PostgREST:
   • SETs jwt.claim.role = <role from JWT>  (authenticated | anon)
   • SETs jwt.claim.sub  = <auth.uid()>
   • Opens a Postgres session as `authenticator`, then SET LOCAL ROLE to
     the claim role → RLS policies now apply as that role.
   ▼
Postgres:
   • Table access → RLS + column GRANTs.
   • RPC call    → PL/pgSQL body runs as its owner if SECURITY DEFINER
     (bypassing the caller's RLS), otherwise as the caller.
   ▼
JSON row / result set → PostgREST → Kong → browser
```

## Error handling

- **Client**: TanStack Query surfaces errors to components; each mutation
  shows a toast via `sonner`. Route-level `errorComponent` (per file) or the
  root `errorComponent` render `ErrorState`.
- **SSR**: `src/server.ts` + `errorMiddleware` render a static HTML fallback.
- **Postgres**: RAISE EXCEPTION with a French message → PostgREST wraps into
  `{ code, message, hint }`; `supabase-js` throws → toast.

## Logging

- Browser: `console.error` + `reportLovableError` (posts to Lovable's error
  ingest).
- Server: plain `console.error` (goes to Bun/Wrangler stdout in dev,
  Cloudflare tail in prod).
- Postgres: `RAISE NOTICE` inside SECURITY DEFINER fns; Docker Compose
  captures via `docker compose logs db`.

## Removing pieces

| Remove | Result |
|--------|--------|
| `src/start.ts` | Build fails — TanStack Start requires it. |
| `src/server.ts` | Build fails — `vite.config.ts` points `tanstackStart.server.entry` here. |
| `src/routes/api/public/cmi-*.ts` | Buyers cannot pay the deposit online (bank-transfer flow still usable). |
| `src/routes/api/public/seed-demo.ts` | Demo login buttons stop bootstrapping accounts. |
| `src/routes/api/public/admin-create-user.ts` | Admin UI cannot create users (workaround: use Studio). |
| `src/routes/api/public/admin-delete-user.ts` | Admin cannot delete users. |
