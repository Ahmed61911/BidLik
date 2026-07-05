# 12 — Module Connections & Debt

## Dependency graph (top-level modules)

```
                        ┌─────────────────────────────┐
                        │        src/routes/*         │
                        │  (UI + loaders + server     │
                        │   handlers under api/public)│
                        └────────┬────────────────────┘
                                 │ imports
        ┌────────────────────────┼──────────────────────┐
        ▼                        ▼                      ▼
 src/components/*        src/lib/{api,             src/lib/{auth,
 (UI + shadcn/ui)         supabaseApi,             routeGuard,
                          supabase*Api,            realtime}
                          supabase*Store,
                          cmi, format, ...}
        │                        │                      │
        └────────────────────────┼──────────────────────┘
                                 ▼
             src/integrations/supabase/{client, client.server,
                                       auth-middleware,
                                       auth-attacher, types}
                                 │
                                 ▼
                @supabase/supabase-js  → Kong → {auth, rest, realtime, storage}
                                                     │
                                                     ▼
                                                Postgres (public.*)
```

## Coupling hotspots

1. **`src/lib/supabaseApi.ts`** is imported by dozens of routes through
   `src/lib/api.ts`. Any RPC/table rename ripples widely — but the
   `ApiClient` interface in `src/lib/api.ts` is the shielded contract, so
   renames should always update `supabaseApi.ts` while keeping method
   names stable.
2. **Every RLS policy calls `has_role()`**. Changing its signature
   (e.g., adding a scope) requires rewriting all policies simultaneously
   in one migration.
3. **`handle_new_user()` couples GoTrue and `public`**: field names
   inside `raw_user_meta_data` (`nom`, `telephone`, `role`, `actif`) must
   match what `signUp({ options: { data } })` sends in `src/lib/auth.ts`
   and `seed-demo.ts` / `admin-create-user.ts`.
4. **`onAuthStateChange` filter** in `src/lib/auth.ts` is load-bearing —
   removing the `SIGNED_IN`/`SIGNED_OUT`/`USER_UPDATED` filter
   re-introduces the silent logout bug on hourly token refresh.
5. **`tick_auctions()` + `pg_cron`** is the only enforcer of deadlines.
   A stopped cron silently freezes the marketplace's state machine.

## Reusable modules

- `src/components/ui/*` — pure design-system primitives, no domain
  coupling.
- `src/lib/format.ts`, `src/lib/utils.ts`, `src/lib/theme.ts`.
- `src/lib/carCatalog.ts`, `src/lib/carImages.ts` — catalog data usable
  outside auctions.
- `src/lib/realtime.ts` — small wrapper, portable if you swap Realtime
  for another WebSocket layer.

## Technical debt

| Area | Debt |
|------|------|
| `src/lib/mockApi.ts` + `mock{Acheteur,Vendeur,Admin,Expert}.ts` | 1 600+ lines of dead mock code. Delete once the team is sure no route imports them. |
| `docker/kong.yml` + `docker/kong-entrypoint.sh` at the top of `docker/` | Duplicate of the copies inside `docker/kong-image/`. Only the latter is built. Remove the root ones. |
| Two similar RPCs `admin_upsert_payment` / `buyer_submit_payment` share ~60 % of the payment-write logic. | Extract a helper (`_upsert_payment_row`) or move the shared shape into a view. |
| `src/lib/supabaseAdminApi.ts` (758 lines) mixes users, cars, auctions, experts, validations. | Split by domain (`admin/users.ts`, `admin/auctions.ts`, …). |
| Column-level `GRANT`s are hidden across two migrations — no manifest. | Document the "public-safe columns" list in `05-database.md` (done). |
| `home-old.tsx` retained in routes | Cosmetic dead route; safe to prune. |
| No test suite. | Add Vitest + Playwright at minimum for RPC contract tests. |
| No CI files in repo. | Add GitHub Actions to run `bun lint`, `bun run build`, `docker compose up -d --build; docker compose logs migrate` and a Playwright smoke test. |

## Bottlenecks

- `place_bid` does `SELECT … FOR UPDATE` on the whole `auctions` row.
  Hot auctions serialize their writes — fine for typical Moroccan
  auction traffic, but the primary key is the only index used, so
  contention scales with concurrent bidders on one lot.
- `tick_auctions()` scans `auctions` twice every 30 s. Fine at
  today's scale; consider adding partial indexes on
  `(status, admin_validation_deadline)` and `(status, payment_deadline)`
  once volume grows.
- `list_auction_bids` returns up to 200 rows and rebuilds bidder names
  server-side; cache with TanStack Query and invalidate on realtime
  events.

## Unnecessary complexity

- Custom `useSyncExternalStore` auth store when TanStack Query's
  `useQuery({ queryKey:["session"], queryFn:getSession })` could work —
  but the store lets non-React callers read state; keep it.
- Two Kong deployments (root `docker/kong.yml` vs `docker/kong-image/`)
  — pick one.
- SSR error double-catch (`errorMiddleware` in `start.ts` +
  `normalizeCatastrophicSsrResponse` in `server.ts`). Both are needed
  because h3 swallows some throws into a 500-JSON — keep, but document.
