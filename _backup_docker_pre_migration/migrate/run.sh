#!/usr/bin/env bash
# ============================================================================
# Applies every supabase/migrations/*.sql file (in filename order) to the local
# Postgres container. Each file runs inside its own transaction and is recorded
# in public._app_migrations so re-runs are idempotent.
#
# Usage:  ./docker/migrate/run.sh
# Env:    PGHOST (default localhost) PGPORT (default 54322)
#         PGUSER (default postgres)  PGPASSWORD (from docker/.env)
#         PGDATABASE (default postgres)
# ============================================================================
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
MIGRATIONS_DIR="$ROOT/supabase/migrations"

if [ -f "$ROOT/docker/.env" ]; then
  set -a; . "$ROOT/docker/.env"; set +a
fi

export PGHOST="${PGHOST:-localhost}"
export PGPORT="${PGPORT:-${POSTGRES_PORT:-54322}}"
export PGUSER="${PGUSER:-postgres}"
export PGPASSWORD="${PGPASSWORD:-${POSTGRES_PASSWORD:-postgres}}"
export PGDATABASE="${PGDATABASE:-${POSTGRES_DB:-postgres}}"

echo "→ Postgres: $PGUSER@$PGHOST:$PGPORT/$PGDATABASE"

psql -v ON_ERROR_STOP=1 -q <<'SQL'
CREATE TABLE IF NOT EXISTS public._app_migrations (
  filename   text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
SQL

shopt -s nullglob
for f in "$MIGRATIONS_DIR"/*.sql; do
  name="$(basename "$f")"
  already=$(psql -Atc "SELECT 1 FROM public._app_migrations WHERE filename = '$name'")
  if [ "$already" = "1" ]; then
    echo "✓ skip  $name"
    continue
  fi
  echo "→ apply $name"
  psql -v ON_ERROR_STOP=1 --single-transaction -f "$f"
  psql -q -c "INSERT INTO public._app_migrations(filename) VALUES ('$name')"
done

echo "✓ all migrations applied"
