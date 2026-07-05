# 09 — Environment Variables

## `.env` and `.env.docker.example`

| Variable | Used in | Purpose | Removal impact | Security |
|----------|---------|---------|----------------|----------|
| `POSTGRES_DB` | `db`, `auth`, `rest`, `realtime`, `storage`, `meta`, `migrate` | DB name (default `postgres`). | DB init fails. | Non-secret. |
| `POSTGRES_PASSWORD` | Same set. | Password for `supabase_admin`, `supabase_auth_admin`, `supabase_storage_admin`, `authenticator`. | All services can't connect. | **Secret** — local demo default is `postgres`. |
| `POSTGRES_PORT` | `docker-compose.yml` | Host-side port publication. | Nothing external to compose. | Non-secret. |
| `JWT_SECRET` | `auth`, `rest`, `realtime`, `storage`, `studio` | HMAC key for signing/validating access tokens. | All auth breaks. | **Secret** — must match the key used to issue `ANON_KEY`/`SERVICE_ROLE_KEY`. |
| `JWT_EXP` | `auth`, `rest` | Access-token lifetime in seconds (default 3600). | Tokens never expire (bad) or expire instantly. | Non-secret. |
| `ANON_KEY` | `kong`, `storage`, `studio`, `realtime` healthcheck, `app` (`VITE_SUPABASE_PUBLISHABLE_KEY`) | JWT with `role: anon` — Kong injects as default `apikey`. | Anonymous reads blocked at gateway. | Publishable (safe to ship). |
| `SERVICE_ROLE_KEY` | `kong`, `storage`, `studio`, `app` (`SUPABASE_SERVICE_ROLE_KEY`) | JWT with `role: service_role` — bypasses RLS. | Admin endpoints break. | **Secret** — never expose to the browser. |
| `API_EXTERNAL_URL` | `auth`, `studio`, `app` (`VITE_SUPABASE_URL`) | Base URL the browser uses (`http://localhost:8000`). | Frontend hits the wrong host. | Non-secret. |
| `SITE_URL` | `auth` (`GOTRUE_SITE_URL`) | Post-signup redirect base. | Confirmation links go nowhere. | Non-secret. |
| `KONG_HTTP_PORT` | `docker-compose.yml` | Host port for Kong. | Cannot reach the gateway. | Non-secret. |
| `STUDIO_PORT` | `docker-compose.yml` | Host port for Studio. | No Studio UI. | Non-secret. |
| `APP_PORT` | `docker-compose.yml` | Host port for the app. | React UI unreachable. | Non-secret. |
| `SUPABASE_URL` (server-only) | `app` env in compose (`http://kong:8000`) | Base URL used by TSS routes (`/api/public/*`). | Admin/CMI routes cannot reach Supabase. | Non-secret. |
| `SUPABASE_PUBLISHABLE_KEY` | `app` env — mirror of `ANON_KEY`. | Same as ANON_KEY on server side. | Server-side supabase clients unauthenticated. | Publishable. |
| `SUPABASE_PROJECT_ID` / `VITE_SUPABASE_PROJECT_ID` | Only used for the localStorage key `sb-<id>-auth-token`. | Wrong value → sessions don't persist across reloads. | Non-secret. |
| `LOVABLE_API_KEY` | Referenced only by cloud tooling. | No local effect. | Managed secret. |
| `SUPABASE_DB_URL` | Cloud tooling. | No local effect. | Managed secret. |

## CMI-related (production only, absent in `.env`)

| Variable | Where | Purpose |
|----------|-------|---------|
| `CMI_CLIENT_ID` | `cmi-init.ts` | Merchant ID at CMI. |
| `CMI_STORE_KEY` | `cmi-init.ts`, `cmi-callback.ts` | Signing key for hosted-form + callback hash. |
| `CMI_GATEWAY_URL` | `cmi-init.ts` | HTTPS URL to POST the form to. |
| `APP_ORIGIN` | `cmi-init.ts` | **Server-trusted origin** used to build `okUrl`, `failUrl`, `callbackUrl`. Never derive from request headers — otherwise an attacker could redirect CMI callbacks to their own host. |

All four are **secret**; without them `cmi-init` returns a friendly
"CMI non configuré" response but the deposit flow is unavailable.

## `Dockerfile` build-time

The image doesn't take custom `ARG`s beyond `oven/bun:1.3-alpine`; runtime
env comes from compose.

## Vite / Node processes

- Browser code reads `import.meta.env.VITE_*` — anything without the
  `VITE_` prefix is stripped at build time and never reaches the client.
- Server-only code (TSS handlers, `client.server.ts`) reads
  `process.env.*`.

## Security summary

- **Never** ship `SERVICE_ROLE_KEY` to the browser (no `VITE_` mirror).
- Rotating `JWT_SECRET` invalidates every existing session and requires
  regenerating `ANON_KEY` / `SERVICE_ROLE_KEY` with the same secret.
- `POSTGRES_PASSWORD` change requires a fresh `db-data` volume unless you
  also `ALTER USER ... WITH PASSWORD` inside Postgres.
- The demo JWT keys in `.env.docker.example` come from the public Supabase
  self-hosting sample — safe locally, **never deploy** them.
