# 02 — Folder Structure

Every folder and every file. `C` = critical, `I` = important, `O` = optional,
`G` = auto-generated.

## Repository root

| Path | Kind | What it does |
|------|------|--------------|
| `package.json` | C | Deps, `dev/build/lint/format` scripts. |
| `bun.lock` | C | Bun lockfile. |
| `bunfig.toml` | O | Bun preferences (registry, install flags). |
| `vite.config.ts` | C | Wraps `@lovable.dev/vite-tanstack-config` (tanstackStart+React+tailwind+tsPaths+nitro). Redirects SSR entry to `src/server.ts`. |
| `tsconfig.json` | C | TS strict, `@/*` path alias, ES2022. |
| `eslint.config.js` | I | Flat ESLint config for React + hooks + prettier. |
| `.prettierrc`, `.prettierignore` | O | Formatter. |
| `components.json` | O | shadcn/ui generator config. |
| `Dockerfile` | I | App container: `oven/bun:1.3-alpine` deps→dev stage. |
| `docker-compose.yml` | I | 10-service local stack. |
| `.dockerignore` | O | Docker build exclusions. |
| `.env` | C | Live env (secrets, keys, URLs). |
| `.env.docker.example` | I | Documented default env for offline mode. |
| `DOCKER.md` | O | Human-oriented Docker quickstart. |
| `AGENTS.md` | O | Notes for the AI agent that scaffolded the project. |
| `README.md` | O | Project readme (if any). |
| `.lovable/project.json` | G | Lovable project pointer. |

## `docker/` — Container build inputs

| Path | What it does |
|------|--------------|
| `docker/db/Dockerfile` | Extends `supabase/postgres:15.6.1.139`; ships init SQL under `initdb.d`. |
| `docker/db/init/00-bootstrap.sql` | Runs once on empty volume: creates Supabase roles (`supabase_admin`, `supabase_auth_admin`, `supabase_storage_admin`, `authenticator`, `anon`, `authenticated`, `service_role`), schemas (`auth`, `storage`, `_realtime`, `extensions`), extensions (`pg_cron`, `uuid-ossp`, `pgcrypto`, `pg_stat_statements`), and the `supabase_realtime` publication. |
| `docker/migrate/Dockerfile` | `postgres:15-alpine` + bash/curl; copies `supabase/migrations/*.sql` into `/migrations` and installs `run.sh` as entrypoint. |
| `docker/migrate/run.sh` | One-shot migrator. Waits for Postgres TCP, then GoTrue `/health`, then `auth.users`, then Storage `/status`, then `storage.objects`. Creates `public._app_migrations` table, seeds the two storage buckets, and idempotently applies every SQL file under `/migrations`. |
| `docker/kong-image/Dockerfile` | Extends `kong:2.8.1` and copies the template + entrypoint. |
| `docker/kong-image/kong-entrypoint.sh` | `envsubst`s `${SUPABASE_ANON_KEY}` / `${SUPABASE_SERVICE_KEY}` into `kong.yml.template` at boot so keys are injected into consumers/plugins. |
| `docker/kong-image/kong.yml.template` | Declarative routes for `/auth/v1`, `/rest/v1`, `/realtime/v1`, `/storage/v1`, `/pg`, `/` (Studio). |
| `docker/kong.yml`, `docker/kong-entrypoint.sh` | Older copies at the docker/ root (kept for reference; `docker-compose.yml` builds the image from `docker/kong-image/`). |

## `supabase/`

| Path | What it does |
|------|--------------|
| `supabase/config.toml` | Only `project_id = "local"`. Consumed by the Supabase CLI; safe to leave. |
| `supabase/migrations/20260625154519_*.sql` | Initial 1 970-line migration: enums, tables, RLS, RPCs, triggers, pg_cron schedule, `handle_new_user` on `auth.users`. |
| `supabase/migrations/20260629090302_*.sql` | Security hardening: revokes `anon` executes on definer functions, adds restrictive `bids_block_direct_writes` / `offers_block_direct_writes`, restricts `has_role` grants. |

## `src/` — Application code

### `src/`

| Path | Kind | Purpose |
|------|------|---------|
| `src/server.ts` | C | Nitro/Worker SSR entry. Wraps TanStack Start's server-entry with a try/catch and a special check for h3's "unhandled HTTPError" JSON to render a friendly error page. Referenced by `vite.config.ts`. |
| `src/start.ts` | C | Registers `errorMiddleware` (request) + `attachSupabaseAuth` (function). |
| `src/router.tsx` | C | `getRouter()` returns a per-request TanStack Router with a fresh `QueryClient` in context and `defaultPreloadStaleTime: 0`. |
| `src/routeTree.gen.ts` | G | Auto-generated route tree. |
| `src/styles.css` | C | Tailwind v4 entry: `@import "tailwindcss"`, `@font-face` for Parkson + Yalta, `@theme` tokens (colors, radii, fonts), typography scales, dark-mode variables, `.no-scrollbar` utility. |

### `src/routes/` — File-based routing (dot-separated)

Public UI:

| File | URL | Purpose |
|------|-----|---------|
| `__root.tsx` | (root shell) | HTML shell, `<HeadContent>`, `<Scripts>`, boot theme script, `QueryClientProvider`, `SiteHeader`/`SiteFooter`, `<Toaster>`. |
| `index.tsx` | `/` | Home V3 landing (hero, 4 pillars, buyer/seller sections, FAQ). |
| `home-old.tsx` | `/home-old` | Previous marketing landing kept for reference. |
| `auctions.index.tsx` | `/auctions` | Public auction list with filters. |
| `auctions.$auctionId.tsx` | `/auctions/:auctionId` | Public auction detail. |
| `events.index.tsx` | `/events` | Auction events list. |
| `events.$eventId.tsx` | `/events/:eventId` | Event detail + its lots. |
| `vehicules.tsx` | `/vehicules` | Public catalog view. |
| `trust.tsx` | `/trust` | Trust / legal page. |
| `comment-ca-marche.tsx`, `-acheteur.tsx`, `-vendeur.tsx` | `/comment-ca-marche/*` | Marketing "how it works" pages. |
| `login.tsx` | `/login` | Sign-in + sign-up + demo-account quick-fill. |
| `inscription-en-attente.tsx` | `/inscription-en-attente` | Post-signup holding page. |
| `unauthorized.tsx` | `/unauthorized` | Shown by `routeGuard` when a role is missing. |

Acheteur (buyer) area — layout `acheteur.tsx` gates by role:

| File | URL |
|------|-----|
| `acheteur.tsx` | `/acheteur` layout + guard |
| `acheteur.index.tsx` | `/acheteur` dashboard |
| `acheteur.encheres.tsx` | `/acheteur/encheres` |
| `acheteur.encherir.$auctionId.tsx` | `/acheteur/encherir/:auctionId` — bid UI |
| `acheteur.paiements.tsx` | `/acheteur/paiements` |
| `acheteur.caution.tsx` | `/acheteur/caution` — deposit |
| `acheteur.caution-paiement.tsx` | `/acheteur/caution-paiement` |
| `acheteur.notifications.tsx` | `/acheteur/notifications` |

Vendeur (seller):

| File | URL |
|------|-----|
| `vendeur.tsx`, `vendeur.index.tsx`, `vendeur.voitures.tsx`, `vendeur.encheres.tsx`, `vendeur.paiements.tsx`, `vendeur.historique.tsx` | `/vendeur/*` |

Expert:

| File | URL |
|------|-----|
| `expert.tsx`, `expert.index.tsx`, `expert.inspections.tsx`, `expert.inspections.$inspectionId.tsx`, `expert.historique.tsx` | `/expert/*` |

Admin:

| File | URL |
|------|-----|
| `admin.tsx` | layout + `admin` guard |
| `admin.index.tsx`, `admin.encheres.tsx`, `admin.voitures.tsx`, `admin.experts.tsx`, `admin.utilisateurs.tsx`, `admin.validations.tsx`, `admin.verifications.tsx`, `admin.paiements.tsx`, `admin.analytics.tsx` | `/admin/*` |

Server routes (TSS `server` blocks):

| File | Method(s) | Purpose |
|------|-----------|---------|
| `api/public/seed-demo.ts` | POST | Idempotent bootstrap of 4 demo accounts via GoTrue admin. |
| `api/public/admin-create-user.ts` | POST | Admin-only: verifies caller has `admin` role, then creates a GoTrue user + profile + role. |
| `api/public/admin-delete-user.ts` | POST | Admin-only: verifies then deletes a user (auth + profile cascade). |
| `api/public/cmi-init.ts` | OPTIONS/POST | Builds a signed CMI 3D-Pay hosted form; creates a pending `payments` row. |
| `api/public/cmi-callback.ts` | POST | CMI server-to-server callback — verifies hash, marks payment + `caution_validee`. |

### `src/components/`

Layout / feature components:

| File | Used by |
|------|---------|
| `SiteHeader.tsx` | `__root.tsx` — logo, nav, role-based menu, auth actions, mobile drawer. |
| `SiteFooter.tsx` | `__root.tsx` |
| `AuctionCard.tsx`, `LotCard.tsx` | Auction lists |
| `CarGallery.tsx` | Auction/car detail |
| `Countdown.tsx`, `DeadlineCountdown.tsx`, `TimeProgressBar.tsx` | Real-time auction UI |
| `SealedBidPanel.tsx` | Sealed-envelope auction UI |
| `ErrorState.tsx`, `NotFoundState.tsx` | Route boundaries |
| `ThemeToggle.tsx` | Dark-mode switch (calls into `src/lib/theme.ts`) |

`src/components/ui/` — shadcn/ui primitives (46 files). Each wraps a Radix
primitive with the design tokens from `styles.css` and CVA variants:

`accordion, alert-dialog, alert, aspect-ratio, avatar, badge, breadcrumb,
button, calendar, card, carousel, chart, checkbox, collapsible, command,
context-menu, dialog, drawer, dropdown-menu, dropdown, form, hover-card,
input-otp, input, label, menubar, navigation-menu, pagination, popover,
progress, radio-group, resizable, scroll-area, select, separator, sheet,
sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toggle-group,
toggle, tooltip`.

None of them are business-specific; they are imported across the app by name.

### `src/hooks/`

| File | Purpose |
|------|---------|
| `use-mobile.tsx` | `useIsMobile()` — matchMedia hook used by shadcn sidebar/sheet. |

### `src/lib/` — Application logic

| File | Purpose | Imported by |
|------|---------|-------------|
| `api.ts` | Re-exports `supabaseApi` under an `ApiClient` interface (mock ↔ real swap point). | Auction/event pages |
| `supabaseApi.ts` | 369 lines. Full read/write layer for auctions, bids (open), offers (sealed), events, cars via `supabase-js`. | `api.ts`, hooks |
| `supabaseAdminApi.ts` | 758 lines. Admin dashboards (users, auctions, cars, experts, validations). | `admin.*` routes |
| `supabaseAdminPaiements.ts` | Admin payments — thin wrapper over `admin_list_payments` / `admin_upsert_payment` / `admin_set_payment_status`. | `admin.paiements.tsx` |
| `supabaseAcheteurStore.ts` | Buyer-specific reads (my bids, my offers, my notifications, my payments). | `acheteur.*` routes |
| `supabaseVendeurApi.ts` | Seller CRUD on `cars` + reads of related auctions/payments. | `vendeur.*` routes |
| `supabaseExpertApi.ts` | Expert inspection queue + report submission. | `expert.*` routes |
| `auth.ts` | Custom `useSyncExternalStore` auth store around `supabase.auth`; demo-account seeding retry. | Route guards, header |
| `routeGuard.ts` | `requireAuth(roles?)` helper for `beforeLoad`. | Role area layouts |
| `realtime.ts` | Thin wrapper `subscribeToAuction(auctionId, cb)` around `supabase.channel(...)`. | Auction detail pages |
| `format.ts` | Dirham + date formatters. | Everywhere |
| `carCatalog.ts`, `carImages.ts` | Static make/model catalog + helper to derive default images. | Seller forms, cards |
| `cmi.ts` | `computeCmiHash`, `verifyCmiCallback` (SHA-512 canonical param string). | `api/public/cmi-*.ts` |
| `sounds.ts` | Small audio-cue helper (outbid ping). | Auction UI |
| `theme.ts` | Boot script + toggle for light/dark; sets `data-theme` on `<html>`. | `__root.tsx`, `ThemeToggle` |
| `utils.ts` | `cn()` (`clsx` + `tailwind-merge`). | Everywhere UI |
| `error-capture.ts`, `error-page.ts`, `lovable-error-reporting.ts` | Cross-runtime error capture + a static HTML error fallback used by SSR wrapper. | `src/server.ts`, `__root.tsx` |
| `mockApi.ts`, `mockAcheteur.ts`, `mockAdmin.ts`, `mockExpert.ts`, `mockVendeur.ts` | Legacy in-memory fakes (kept for storybooking / offline dev only). | Nothing critical — dead code candidates. |

### `src/integrations/supabase/` — Auto-generated (do not edit)

| File | Purpose |
|------|---------|
| `client.ts` | Browser Supabase client, publishable key. |
| `client.server.ts` | `supabaseAdmin` (service role) — server-only. |
| `auth-middleware.ts` | `requireSupabaseAuth` server-fn middleware (validates bearer). |
| `auth-attacher.ts` | Client-side `functionMiddleware` that adds the bearer to every server-fn call. |
| `types.ts` | Generated DB types from Supabase schema. |

### `src/types/` — Domain models

| File | Contents |
|------|----------|
| `auction.ts` | `Car`, `Auction`, `Bid`, `Offer`, `AuctionEvent`, enums. |
| `auth.ts` | `Role`, `AuthUser`, `AuthSession`, `LoginInput`, `RegisterInput`. |
| `acheteur.ts`, `vendeur.ts`, `expert.ts`, `admin.ts` | Role-specific view models. |

### `src/assets/`

| Path | Purpose |
|------|---------|
| `assets/bidlik-logo.png`, `.svg`, `bidlik-mark.png` | Brand marks. |
| `assets/fonts/Parkson-DemiBold.woff/woff2` | Heading font. |
| `assets/fonts/YaltaSans.woff` | Body font. |

### `public/`

| File | Purpose |
|------|---------|
| `manifest.webmanifest` | PWA metadata. |
| `icon-192.png`, `icon-512.png` | App icons. |

## Critical vs optional summary

- **Critical** (removing = broken build or runtime): `package.json`,
  `bun.lock`, `vite.config.ts`, `tsconfig.json`, `src/server.ts`,
  `src/start.ts`, `src/router.tsx`, `src/routes/__root.tsx`,
  `src/routes/index.tsx`, `src/styles.css`, `src/integrations/supabase/*`,
  every file in `src/routes/api/public/*`, `docker/db/*`, `docker/migrate/*`,
  `docker/kong-image/*`, `supabase/migrations/*`.
- **Important** (removing degrades a whole feature area): each role-area
  `src/lib/supabase*.ts` and its `src/routes/{role}.*.tsx` pages.
- **Optional / dead**: `src/lib/mock*.ts`, `docker/kong.yml`,
  `docker/kong-entrypoint.sh` (duplicated by `docker/kong-image/`),
  `src/routes/home-old.tsx`.
