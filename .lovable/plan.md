
# Architecture & .NET Migration Documentation Plan

Deliverable: a set of Markdown files under `/docs/architecture/`. No source code changes. Fully exhaustive: every table column, every RPC, every route, every dependency, every env var, every file → `.cs` mapping. .NET target = **.NET 8 + EF Core + Npgsql**, with per-section sidebars comparing **Dapper** where the current design (RLS, RPC-heavy business logic, `security definer` functions) makes EF Core awkward.

## Files I will create

```text
docs/
└── architecture/
    ├── 00-README.md                  Index + reading order + legend
    ├── 01-overview.md                Overall architecture, ASCII request-flow diagrams
    ├── 02-folder-structure.md        Every folder + file: purpose, importers, criticality
    ├── 03-frontend.md                React 19, TanStack Start/Router/Query, Tailwind v4,
    │                                 shadcn/ui, fonts, theme, page lifecycle
    ├── 04-backend.md                 createServerFn, server routes, middleware,
    │                                 supabaseApi/*, mock*.ts, request lifecycle
    ├── 05-database.md                Every table (auctions, bids, cars, offers,
    │                                 profiles, user_roles, payments, notifications,
    │                                 auction_events, expert_assignments): columns,
    │                                 FKs, indexes, RLS policies, GRANTs, enums, RPCs
    ├── 06-authentication.md          Supabase GoTrue flow, JWT, RLS, has_role,
    │                                 _authenticated gate, auth-attacher, routeGuard
    ├── 07-api.md                     Every REST route (PostgREST) + every RPC +
    │                                 every /api/public/* TSS route: input, validation,
    │                                 business logic, response, errors, files
    ├── 08-docker.md                  Every service in docker-compose.yml, Dockerfiles,
    │                                 kong.yml.template, migrate/run.sh, bootstrap.sql,
    │                                 healthchecks, startup DAG, volumes, ports
    ├── 09-env-vars.md                Every variable in .env / .env.docker.example /
    │                                 Dockerfile ARG: consumers, purpose, removal impact,
    │                                 security posture
    ├── 10-request-flows.md           End-to-end traces (file-by-file) for:
    │                                 Register, Login, Place Bid, Submit Offer,
    │                                 Upload payment proof, Admin validate auction,
    │                                 Expert submit report, CMI callback, tick_auctions
    ├── 11-dependencies.md            Every package.json dep + every Docker image:
    │                                 why, where, replaceable?, alternatives
    ├── 12-connections-map.md         Module dependency graph, coupling hotspots,
    │                                 reusable modules, tech debt, bottlenecks
    ├── 13-dotnet-migration.md       .NET 8 blueprint: concept mapping, per-file
    │                                 TS→C# table for ALL backend files, obsolete files,
    │                                 unchanged frontend files, contract preservation,
    │                                 env/Docker/CI changes, EF Core vs Dapper sidebars
    ├── 14-database-migration.md      Current Postgres+RLS+RPC model, EF Core DbContext
    │                                 blueprint, migration to SQL Server / MySQL,
    │                                 per-file impact list, RPC→C# service translation
    └── 15-final-report.md            Current arch diagram, target .NET arch diagram,
                                      phased migration plan, risk matrix, per-module
                                      difficulty rating, keep/rewrite/drop lists,
                                      overall strategy
```

## Method

1. **Enumerate**: `code--list_dir` on every folder; `code--view` every non-trivial file (routes, lib, integrations, docker, migrate scripts, Kong template, styles, types, server fns).
2. **Introspect DB**: `supabase--read_query` for full column/policy/index/FK dumps of all 10 tables; enumerate enums, triggers, cron jobs; reuse the RPC dumps already in context.
3. **Trace flows**: for each user action, walk browser → component → hook → `supabaseApi.ts` or `createServerFn` → Kong → GoTrue/PostgREST/Storage → SQL → response, listing every file.
4. **Map to .NET**: for each backend/server file produce a row `current path → Controllers/Services/Middleware/DTO path (.cs)` with notes on EF Core vs Dapper for RPC-heavy paths (`place_bid`, `submit_offer`, `tick_auctions`, `buyer_submit_payment`).
5. **Diagrams**: ASCII in every section (request flow, Docker DAG, auth flow, auction state machine, .NET target architecture, module graph).

## Depth guarantees

- **Every** file under `src/`, `docker/`, `supabase/`, root config gets at least one line in §02 with purpose + importers + critical/optional.
- **Every** shadcn/ui primitive is listed (grouped table row per file, not skipped).
- **Every** column of every public-schema table in §05.
- **Every** RPC (already 20+ in context) documented in §07 with signature, SECURITY DEFINER status, callers, RLS interaction.
- **Every** env var in `.env`, `.env.docker.example`, `docker-compose.yml`, `Dockerfile` in §09.
- **Every** backend TS file gets a `.cs` counterpart in §13, including `lib/supabaseApi.ts`, `lib/supabaseAdminApi.ts`, `lib/supabaseVendeurApi.ts`, `lib/supabaseExpertApi.ts`, `lib/supabaseAcheteurStore.ts`, `lib/cmi.ts`, `lib/realtime.ts`, all `routes/api/public/*.ts`, all `integrations/supabase/*`.

## .NET 8 stack decisions I will document

- **Web**: ASP.NET Core 8 Minimal APIs + Controllers hybrid (Controllers for the CRUD surface currently served by PostgREST; Minimal APIs for `/api/public/*` webhooks).
- **ORM**: EF Core 8 + Npgsql for entity CRUD and migrations; **Dapper** sidebar for the auction/bid/offer/payment RPCs where preserving `SELECT ... FOR UPDATE` semantics and single-round-trip atomicity matters.
- **Auth**: Replace Supabase GoTrue with ASP.NET Core Identity + JWT bearer, OR keep GoTrue and only replace the Data API. Both variants documented; recommendation given.
- **Authorization**: Policy-based (`[Authorize(Policy="Admin")]`) mapped from current `has_role()` + RLS. RLS strategy: either keep in Postgres (Dapper sets `SET LOCAL request.jwt.claims`) or move to C# authorization filters (EF Core path). Trade-offs documented.
- **Realtime**: Replace Supabase Realtime with SignalR; contract mapping documented so the React client only swaps the transport.
- **Background jobs**: Replace pg_cron `tick_auctions()` with Hangfire or a hosted `BackgroundService`; both compared.
- **Storage**: Replace Supabase Storage with MinIO (S3-compatible) or Azure Blob; signed-URL contract preserved so frontend upload code is unchanged.
- **Docker**: New `dotnet-app` service replaces `app` + `rest` + `auth` (if Identity chosen); `db` unchanged; `kong` optional (drop if not proxying). New compose file provided as reference block.
- **Contracts preserved**: JSON shapes returned by `supabaseApi.ts` become the C# DTOs — frontend `src/lib/api.ts` interface stays identical, only the base URL changes.

## What I will explicitly call out as "do not migrate"

- shadcn/ui primitives, Tailwind config, all `src/routes/**` UI files, `src/components/**`, `src/hooks/**` → frontend stays.
- `supabase/config.toml`, `src/integrations/supabase/*` (auto-generated) → deleted post-migration.
- `docker/kong-image/`, `docker/migrate/`, `docker/db/init/00-bootstrap.sql` → replaced by EF Core migrations + ASP.NET startup.

## Out of scope (I will not do)

- Any code changes to the running project.
- Actually writing C# code — only blueprint, mappings, and reference snippets inside the docs.
- Publishing / deploying.

After you approve, I switch to build mode and generate all 16 files in one pass.
