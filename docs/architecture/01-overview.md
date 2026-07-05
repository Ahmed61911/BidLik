# 01 — Project Overview

## What Bidlik is

Bidlik is a **Moroccan real-time car-auction platform**. Sellers (particuliers,
loueurs, entreprises) list vehicles → an expert inspects & scores them → an
admin schedules them into open or sealed auctions → authenticated buyers place
live bids (with anti-snipe extensions) or confidential sealed offers → the
admin validates the winner → the buyer pays through CMI (Moroccan card
gateway) or bank transfer → the car is delivered.

All money is displayed in **MAD (Dirhams)**. The UI is French.

## Tech stack (one-line summary)

| Layer | Choice |
|-------|--------|
| Language | TypeScript 5.8 (strict) |
| Frontend framework | React 19 |
| SSR / router / server fns | TanStack Start 1.167 + TanStack Router 1.168 |
| Data fetching (client) | TanStack Query 5 |
| Styling | Tailwind CSS v4 (native `@theme` in `src/styles.css`) + shadcn/ui + Radix primitives |
| Fonts | Parkson (H1–H4), Yalta Sans (body) — self-hosted `woff/woff2` |
| Build | Vite 8 + `@lovable.dev/vite-tanstack-config` (wraps `tanstackStart`, `viteReact`, `tailwindcss`, `tsConfigPaths`, `nitro`) |
| Runtime target | Cloudflare Workers-compatible (nitro output) in the cloud; Bun 1.3 dev server in Docker |
| Package manager | Bun 1.3 |
| Backend gateway | Kong 2.8 (declarative, DB-less) |
| Auth | Supabase GoTrue v2.158 |
| Data API | PostgREST v12.2 |
| Realtime | Supabase Realtime v2.30 (Postgres logical replication) |
| Storage | Supabase storage-api v1.11 (files on disk in a volume) |
| Meta / Studio | supabase/postgres-meta v0.84 + supabase/studio 20241014 |
| Database | Postgres 15.6 (custom `supabase/postgres` image) + `pg_cron`, `pg_stat_statements`, `pgaudit`, `uuid-ossp` |
| Payments | CMI (Centre Monétique Interbancaire) via 3D-Pay Hosting form-post |
| Mail (offline) | Inbucket 3.0 (dev SMTP + web UI) |

## Overall architecture (ASCII)

```
                              ┌───────────────────────────────────┐
                              │        Browser (React 19)         │
                              │  TanStack Router client + Query   │
                              └──────────────┬────────────────────┘
                                             │  HTTPS
                     ┌───────────────────────┼───────────────────────┐
                     │                       │                       │
                     ▼                       ▼                       ▼
      ┌────────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐
      │  App server (SSR)      │  │  Kong API gateway    │  │  Direct WebSocket│
      │  Bun+Vite in dev,      │  │  :8000               │  │  to Realtime     │
      │  Cloudflare Worker in  │  │  Route table below   │  │  /realtime/v1/*  │
      │  prod (Nitro output).  │  └────┬─────┬─────┬─────┘  └──────────────────┘
      │  Serves /*, /api/*     │       │     │     │
      │  server fns & TSS      │       │     │     │
      │  routes.               │       ▼     ▼     ▼
      └───────┬────────────────┘   Auth  REST  Storage
              │                    9999  3000   5000
              │                     │     │     │
              │                     └──┬──┴──┬──┘
              ▼                        ▼     ▼
        supabase-js  ────────────► Postgres 15 (RLS + RPCs + pg_cron)
        (fetch to Kong)                 ▲
                                        │
                                        └── pg_cron every 30 s → tick_auctions()
```

### Kong routing (from `docker/kong-image/kong.yml.template`)

| Path prefix | Upstream service | Purpose |
|-------------|------------------|---------|
| `/auth/v1/*` | `auth:9999` | GoTrue: sign-in, sign-up, JWT issuance, admin |
| `/rest/v1/*` | `rest:3000` | PostgREST: table CRUD + RPCs, JWT-authorised |
| `/realtime/v1/*` | `realtime:4000` | Phoenix WebSocket for Postgres changes / broadcast |
| `/storage/v1/*` | `storage:5000` | File upload/download, signed URLs |
| `/pg/*` | `meta:8080` | postgres-meta (used by Studio) |
| `/` (default) | `studio:3000` | Supabase Studio admin UI |

Kong injects the anon key as `apikey`/`Authorization` for anonymous calls and
forwards the caller's own bearer token when present.

### Request lifecycle — anatomy of a bid

```
Browser click "Enchérir 45 000 DH"
   │
   ▼
src/routes/acheteur.encherir.$auctionId.tsx  ── useMutation ──►
   │
   ▼
src/lib/api.ts → supabaseApi.placeBid()   (src/lib/supabaseApi.ts)
   │
   ▼
supabase.rpc("place_bid", { p_auction_id, p_amount })
   │  fetch POST /rest/v1/rpc/place_bid  with  Authorization: Bearer <jwt>
   ▼
Kong :8000  ── route /rest/v1 ─►  PostgREST :3000
   │
   ▼
Postgres: EXECUTE public.place_bid(...)   SECURITY DEFINER
   │  ─ locks auction row (SELECT FOR UPDATE)
   │  ─ validates status/type/amount
   │  ─ INSERT INTO bids
   │  ─ trigger notify_on_bid  → INSERT INTO notifications (previous leader)
   │  ─ UPDATE auctions SET current_price, bid_count, top_bidder_id,
   │            ends_at = extended by 2 min if < 2 min remaining
   ▼
Row returned → PostgREST → Kong → browser
   ▼
Realtime service pushes UPDATE on `auctions` and INSERT on `bids` via
Postgres logical replication to all connected WebSocket subscribers.
   ▼
Other buyers' UIs receive the change and re-render.
```

## Backend model in one sentence

> "The backend is Postgres." All business logic lives in `SECURITY DEFINER`
> PL/pgSQL functions (`place_bid`, `submit_offer`, `validate_auction`,
> `buyer_submit_payment`, `assign_expert`, `submit_expert_report`,
> `admin_*`, `tick_auctions`, `handle_new_user`). PostgREST exposes tables
> and RPCs over HTTP; RLS + column-level GRANTs enforce access.

The Node/Bun app server contributes only:

1. **SSR** of React (Vite/Nitro server entry `src/server.ts`).
2. **Five thin TSS routes** under `src/routes/api/public/*` that need the
   service-role key (CMI init/callback, seed demo users, admin-create /
   admin-delete user via GoTrue Admin API).
3. A single client-side middleware (`attachSupabaseAuth`) that adds the
   bearer to every server-fn call.

There are **no `createServerFn`s that call Supabase** — everything the browser
needs goes directly through `supabase-js` → Kong → PostgREST.

## Background jobs

- **`pg_cron`** schedules `SELECT public.tick_auctions()` every 30 seconds.
  It advances `scheduled → live → closed` based on `starts_at`/`ends_at`,
  cancels closed auctions the admin didn't validate within 24 h, and cancels
  validated auctions the winner didn't pay within 48 h.

## Storage

Two private buckets (see `docker/migrate/run.sh` bootstrap):

| Bucket | Public | MIME allowed | Used for |
|--------|--------|--------------|----------|
| `car-images` | no | image/png, jpeg, webp, gif | Car photo uploads |
| `payment-proofs` | no | image/png, jpeg, webp, application/pdf | Buyer payment proofs |

Access via signed URLs generated by `storage-api`.

## Deployment options

| Mode | What runs where |
|------|-----------------|
| **Lovable Cloud** (default) | React SSR on Cloudflare Workers; Supabase-managed Postgres/Auth/Storage/Realtime. |
| **Offline Docker** (this repo) | Everything on the developer's machine via `docker-compose.yml` — 10 containers, no external services. |

## What would break if you removed each pillar

| Component | Removal impact |
|-----------|----------------|
| Postgres | Total outage — no data, no auth (GoTrue's own tables live in `auth` schema). |
| GoTrue | Nobody can sign in; SSR still serves anon-visible pages. |
| PostgREST | No CRUD/RPC over HTTP → almost every screen breaks. |
| Kong | No unified `:8000`; each service would need its own hostname. |
| Realtime | Bids still work but other buyers see updates only on page refresh. |
| Storage | No car photos, no payment proofs. |
| Migrate service | Fresh DBs boot without app schema → app fails at first query. |
| `pg_cron` / `tick_auctions` | Auctions never advance from `scheduled` to `live` and never close automatically. |
| App container | No UI; API stack still works from raw HTTP. |
