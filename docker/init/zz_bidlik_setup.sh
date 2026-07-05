#!/bin/bash
# ============================================================================
# zz_bidlik_setup.sh
# Mounted as a SINGLE FILE at /docker-entrypoint-initdb.d/zz_bidlik_setup.sh
# (see docker-compose.yml) — deliberately NOT bind-mounting the whole ./init
# folder onto /docker-entrypoint-initdb.d, and named to sort alphabetically
# AFTER the image's own bootstrap script, migrate.sh.
#
# Why a .sh file and not a plain .sql file: Postgres's docker-entrypoint
# sources *.sh init files with the container's environment already exported
# (POSTGRES_PASSWORD etc. available as real shell variables), whereas *.sql
# files are simply piped through psql with no variable substitution. We need
# $POSTGRES_PASSWORD here, so this has to be a shell script.
#
# Verified empirically against supabase/postgres:15.6.1.146's own
# /docker-entrypoint-initdb.d/migrate.sh:
#   - It creates the `postgres` role and ALTERs `supabase_admin`'s password
#     to $POSTGRES_PASSWORD.
#   - It does NOT set a password for `authenticator`, `supabase_auth_admin`,
#     or `supabase_storage_admin` — those roles are created (by the image's
#     own init-scripts/*.sql) with no usable network password at all, so
#     GoTrue/PostgREST/Storage — which connect over the Docker bridge network
#     as those roles — get a hard "password authentication failed" even
#     though `docker exec ... psql -h 127.0.0.1` appears to work (pg_hba.conf
#     trusts 127.0.0.1 unconditionally, which is a trap: it works over
#     loopback with ANY password, including a wrong one, so that path alone
#     is not a valid way to verify these credentials).
#   - The real self-hosting Supabase docker-compose ships an additional
#     roles.sql (not present in this project) that presumably sets these
#     passwords; this file is that missing piece, scoped to only what
#     BidLik's own compose actually connects as over the network.
#
# Also provisions pg_cron / pg_net (available in the image, not pre-created)
# for supabase/migrations' auction-tick scheduler and async HTTP calls.
# ============================================================================
set -euo pipefail

psql -v ON_ERROR_STOP=1 --no-password --no-psqlrc -U supabase_admin -d "${POSTGRES_DB:-postgres}" <<-EOSQL
  ALTER ROLE authenticator WITH LOGIN PASSWORD '${POSTGRES_PASSWORD}';
  ALTER ROLE supabase_auth_admin WITH PASSWORD '${POSTGRES_PASSWORD}';
  ALTER ROLE supabase_storage_admin WITH PASSWORD '${POSTGRES_PASSWORD}';

  -- The realtime container connects with "SET search_path TO _realtime" and
  -- expects that schema to already exist before it runs its own Ecto
  -- migrations (it does not CREATE SCHEMA itself) — without this, it fails
  -- on first boot with "no schema has been selected to create in".
  CREATE SCHEMA IF NOT EXISTS _realtime AUTHORIZATION supabase_admin;

  CREATE EXTENSION IF NOT EXISTS pg_cron;
  CREATE EXTENSION IF NOT EXISTS pg_net;
EOSQL
