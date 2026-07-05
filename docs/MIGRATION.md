# Migrating BidLik to a local self-hosted Supabase stack

This project ships with everything needed to run the backend locally in
Docker: Postgres 15, GoTrue (auth), PostgREST (Data API), Storage API, Kong
(API gateway) and Studio. Nothing about the frontend needs to change — the
same `@supabase/supabase-js` client talks to `http://localhost:8000` instead
of the hosted URL.

## What's in the repo

```
docker/
  docker-compose.yml            # full local stack
  .env.example                  # copy to docker/.env before boot
  init/
    00_extensions_and_roles.sql # extensions, roles, auth shim (runs on first boot)
    01_schema_consolidated.sql  # every supabase/migrations/*.sql concatenated
  kong/kong.yml                 # /auth/v1, /rest/v1, /storage/v1 routing
  migrate/run.sh                # transactional migrator with a _app_migrations ledger
supabase/migrations/*.sql       # source of truth — add new migrations here
```

`docker/init/*.sql` is only used on the **first** boot (Postgres runs
`/docker-entrypoint-initdb.d` against an empty data volume). After that the
schema is maintained exclusively through `docker/migrate/run.sh`.

## Runbook

### 1. Boot the stack

```bash
cd docker
cp .env.example .env
# edit .env — at minimum set POSTGRES_PASSWORD, JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY.
# Generate ANON_KEY / SERVICE_ROLE_KEY from JWT_SECRET, see .env.example.
docker compose up -d
docker compose logs -f db      # wait for "database system is ready to accept connections"
```

Services on the host:

| Port  | Service                      |
|-------|------------------------------|
| 8000  | Kong gateway (single API URL)|
| 54322 | Postgres                     |
| 9999  | GoTrue (direct, optional)    |
| 3000  | PostgREST (direct, optional) |
| 5000  | Storage API (direct)         |
| 3001  | Studio UI                    |

### 2. Apply schema

The first boot ran `01_schema_consolidated.sql` automatically. If you started
Postgres against an existing volume, or want to top up new migrations, use:

```bash
./docker/migrate/run.sh
```

It reads `supabase/migrations/*.sql` in filename order, wraps each file in a
transaction, and records applied files in `public._app_migrations`. Re-runs
are no-ops.

### 3. Point the app at the local stack

Add to your local `.env` (do **not** commit):

```bash
VITE_SUPABASE_URL=http://localhost:8000
VITE_SUPABASE_PUBLISHABLE_KEY=<ANON_KEY from docker/.env>
SUPABASE_URL=http://localhost:8000
SUPABASE_PUBLISHABLE_KEY=<ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY>
```

Restart the dev server. The auto-generated `src/integrations/supabase/client.ts`
already reads these env vars — no code change required.

### 4. Seed / demo data

- Manual: run `psql` against `localhost:54322` and insert as needed.
- Endpoint: `POST /api/public/seed-demo` (requires `ALLOW_DEMO_SEED=true` in the app env).

## Adding a new migration

1. Create `supabase/migrations/<UTC-timestamp>_<slug>.sql`.
2. `./docker/migrate/run.sh` — applies it locally.
3. Commit the file. Production applies the same file the same way.

## Architecture notes for the migration

The frontend already isolates backend I/O behind two swap points, so
swapping Supabase for another provider later stays contained:

- `src/lib/api.ts` — thin re-export of `supabaseApi`. Swap the impl here.
- `src/lib/storage/index.ts` — `provider` and `imageProcessor` singletons.
  Replace `SupabaseStorageProvider` with any `StorageProvider`.

Direct `supabase` client usage lives mainly in `src/lib/supabase*Api.ts`
and a handful of routes; centralising further is optional and out of scope
for the local-DB move (auth + realtime channels benefit from the raw client).

## Troubleshooting

- **`role "authenticator" does not exist`** — the init SQL didn't run
  because the Postgres volume already existed. Either `docker compose down -v`
  (destroys data) or apply `docker/init/00_extensions_and_roles.sql` by hand.
- **`Expected 3 parts in JWT; got 1`** — `ANON_KEY` / `SERVICE_ROLE_KEY`
  in `docker/.env` aren't JWTs signed with `JWT_SECRET`. Regenerate them.
- **`permission denied for table X`** — a migration created a table without
  the required `GRANT`s. Add `GRANT ... TO authenticated, service_role`
  in the same migration and re-run.
- **Auth callbacks loop** — `GOTRUE_SITE_URL` / `GOTRUE_URI_ALLOW_LIST`
  in `docker-compose.yml` must include the app's dev URL.
