-- ============================================================================
-- 00_extensions_and_roles.sql
-- Runs FIRST on a fresh Postgres. Recreates the minimum Supabase-shaped
-- environment that our public-schema migrations depend on:
--   * required extensions
--   * the auth / storage schemas
--   * the anon / authenticated / service_role / authenticator roles
--   * a minimal auth.users table + auth.uid() helper
-- The full self-hosted GoTrue container will manage auth.users at runtime;
-- this file only guarantees the objects exist so migrations can reference them.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Schemas expected by the Supabase stack
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS extensions;

-- Roles used by PostgREST / GoTrue / Storage
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD 'authenticator_pw_change_me';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    CREATE ROLE supabase_auth_admin NOINHERIT LOGIN PASSWORD 'auth_admin_pw_change_me' CREATEROLE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_storage_admin') THEN
    CREATE ROLE supabase_storage_admin NOINHERIT LOGIN PASSWORD 'storage_admin_pw_change_me' CREATEROLE;
  END IF;
END $$;

GRANT anon, authenticated, service_role TO authenticator;
GRANT ALL ON SCHEMA public TO postgres, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT USAGE ON SCHEMA auth   TO anon, authenticated, service_role;
GRANT ALL  ON SCHEMA auth    TO supabase_auth_admin;
GRANT ALL  ON SCHEMA storage TO supabase_storage_admin;

-- Minimal auth.users so migrations that FK to it can be applied before GoTrue
-- starts. GoTrue will ALTER/own this table when it boots.
CREATE TABLE IF NOT EXISTS auth.users (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email        text,
  phone        text,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- auth.uid() shim: real GoTrue installs replace this with a JWT-aware version.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon');
$$;

CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(current_setting('request.jwt.claims', true)::jsonb, '{}'::jsonb);
$$;
