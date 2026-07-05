# Multi-stage Dockerfile with two targets:
#
#   dev  (default) — runs the Vite dev server (SSR + HMR). Used by
#        docker/docker-compose.yml to run the whole project (app + local
#        Supabase) with one `docker compose up`. This is NOT a production
#        build.
#
#   prod — a real Node-servable build, for deploying to a single OVH VPS
#        via Docker. Needs real filesystem access for local storage
#        (src/lib/storage), so it overrides the project's default Cloudflare
#        Worker build target with Nitro's node-server preset (see
#        vite.config.ts) — that override only takes effect outside the
#        Lovable sandbox, so the sandbox's own Cloudflare deploys are
#        unaffected by this file.
FROM oven/bun:1.3-alpine AS base
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ---------------------------------------------------------------------------
FROM base AS dev
COPY . .
EXPOSE 8080
CMD ["bun", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8080"]

# ---------------------------------------------------------------------------
FROM base AS build
COPY . .
RUN bun run build

# ---------------------------------------------------------------------------
FROM oven/bun:1.3-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.output ./.output
EXPOSE 8080
CMD ["bun", "run", ".output/server/index.mjs"]
