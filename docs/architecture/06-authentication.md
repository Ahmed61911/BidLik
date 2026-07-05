# 06 — Authentication & Authorization

## Flow map

```
┌───────────────┐    email+pwd     ┌──────────────┐  JWT   ┌──────────────┐
│ login.tsx     │─────────────────►│ GoTrue :9999 │───────►│ supabase-js  │
│ useAuth.login │                  │ (Kong /auth) │        │ localStorage │
└──────┬────────┘                  └──────┬───────┘        └──────┬───────┘
       │                                  │                       │
       │  onAuthStateChange('SIGNED_IN')  │                       │
       ▼                                  ▼                       ▼
authStore.setState              handle_new_user trigger    Every REST/RPC
 (loadProfileAndRoles)          on auth.users INSERT       carries Bearer
       │                                                   token → RLS.
       ▼
UI reads user + roles via useAuth()
```

## Storage locations

- **JWT session** — `localStorage["sb-<project>-auth-token"]` managed by
  `supabase-js`. Rotates via refresh tokens ~ hourly.
- **RLS claims** — PostgREST decodes the JWT server-side using
  `PGRST_JWT_SECRET` (== `JWT_SECRET`) and sets Postgres GUCs
  `request.jwt.claim.sub`, `request.jwt.claim.role`.
- **Role of the DB session** — `authenticator` connects, `SET LOCAL ROLE`
  to `anon` or `authenticated` per request.

## `src/lib/auth.ts` — the custom store

Uses `useSyncExternalStore` (React 18/19-safe) rather than Context so
non-React callers (route guards, mutations) can read state synchronously:

```
authStore = { getState, subscribe, login, register, logout, hasRole, hasAnyRole }
```

Init sequence:

1. Module load in the browser calls `ensureInit()`.
2. Subscribes to `supabase.auth.onAuthStateChange` **filtered** to
   `SIGNED_IN`, `SIGNED_OUT`, `USER_UPDATED` — ignores `INITIAL_SESSION`
   and `TOKEN_REFRESHED` (which fire on every tab focus and hourly
   refresh, and would otherwise re-hydrate the whole profile and can
   flip the store to `anonymous` on any transient RPC failure).
3. Hydrates from `supabase.auth.getSession()` → calls
   `loadProfileAndRoles(userId)`:
   - `supabase.rpc("get_my_profile")` → own email/phone/avatar.
   - `supabase.from("user_roles").select("role").eq("user_id", uid)`.
   - Wrapped in try/catch — a transient failure keeps the session, only
     status changes on `SIGNED_OUT`.

## Login

```ts
authStore.login({ email, password }) →
  supabase.auth.signInWithPassword(...) →
  if error && email is a demo email → POST /api/public/seed-demo, retry once →
  loadProfileAndRoles → setState({ status: "authenticated", session }).
```

The `is_my_account_active` check that used to reject unvalidated accounts
was removed to make offline demo login work; the RPC is still in the DB for
future re-use. Registration auto-signs-in (`GOTRUE_MAILER_AUTOCONFIRM=true`
in Docker).

## Signup

`authStore.register({ email, password, nom, telephone, role })`

- `supabase.auth.signUp({ email, password, options: { data: { nom, telephone, role, actif: true } } })`
- GoTrue INSERTs into `auth.users` → trigger `handle_new_user` copies
  `raw_user_meta_data` into `public.profiles` and inserts the requested
  role into `public.user_roles`.
- With `MAILER_AUTOCONFIRM=true` locally, a session is returned
  immediately. In cloud mode it explicitly signs in with the same
  credentials to acquire a session.

## Logout

`authStore.logout()` optimistically flips to `anonymous` then fires
`supabase.auth.signOut()` (fire-and-forget).

## Route guards (`src/lib/routeGuard.ts`)

```ts
export function requireAuth(roles?: Role[]): NonNullable<RouteOptions["beforeLoad"]> {
  return async () => {
    const state = authStore.getState();
    if (state.status === "loading") { /* wait one microtask */ }
    if (state.status !== "authenticated") throw redirect({ to: "/login" });
    if (roles && !authStore.hasAnyRole(roles)) throw redirect({ to: "/unauthorized" });
  };
}
```

Applied on role-area layout routes: `acheteur.tsx`, `vendeur.tsx`,
`expert.tsx`, `admin.tsx` each set `beforeLoad: requireAuth(["<role>"])`.
The subordinate pages inherit the gate.

## Authorization inside Postgres

Two independent layers:

1. **Column-level GRANTs** — restrict which columns `anon`/`authenticated`
   may `SELECT`. This is how `email`, `telephone`, `minimum_accepted_price`,
   `top_bidder_id`, `prix_plancher` are hidden from anonymous visitors.
2. **RLS policies** — filter rows and gate writes. Almost every policy calls
   `public.has_role(auth.uid(), '<role>')` for admin escape hatches.

`has_role()` is `SECURITY DEFINER STABLE`, so RLS policies can call it
without infinite recursion (it reads `user_roles` without triggering RLS on
that table).

## GoTrue integration files

| File | Role |
|------|------|
| `src/integrations/supabase/client.ts` | Browser client — reads `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`. |
| `src/integrations/supabase/client.server.ts` | `supabaseAdmin` service-role client. Used by the five `/api/public/*` routes. |
| `src/integrations/supabase/auth-middleware.ts` | `requireSupabaseAuth` — validates Bearer for future `createServerFn`s. |
| `src/integrations/supabase/auth-attacher.ts` | Client `functionMiddleware` that attaches Bearer to server-fn calls. |
| `src/integrations/supabase/types.ts` | Generated DB types. |

## Security-hardening migration (2026-06-29)

- `REVOKE EXECUTE` from `anon`/`authenticated` on internal SECURITY DEFINER
  functions that should only be called by triggers or admin routes.
- `has_role()` execute limited to `authenticated` + `service_role`.
- Restrictive `bids_block_direct_writes` and `offers_block_direct_writes`
  policies force all writes through the RPCs.
- Column GRANTs applied to `cars` (hide seller pricing) and `profiles`
  (hide cross-user PII).

## Failure modes

| Symptom | Cause |
|---------|-------|
| "Invalid login credentials" locally | `.env` pointing at cloud but Docker running; `GOTRUE_MAILER_AUTOCONFIRM` false. |
| RLS 401 on `/rest/v1/auctions` | Missing `apikey` header — Kong should inject anon by default. |
| Silent sign-out after ~1h | Filter on `onAuthStateChange` missing — every `TOKEN_REFRESHED` retriggering `loadProfileAndRoles` throwing. |
| "permission denied for column email" | Column GRANT working as intended — use `get_my_profile()` instead. |
