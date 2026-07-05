-- ============================================================
-- Pass 1: Auth/RBAC + DB security hardening
-- ============================================================

-- 1) FORCE RLS on sensitive tables (defense-in-depth: blocks even
--    table owners; only SECURITY DEFINER functions can bypass).
ALTER TABLE public.bids         FORCE ROW LEVEL SECURITY;
ALTER TABLE public.offers       FORCE ROW LEVEL SECURITY;
ALTER TABLE public.payments     FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles   FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profiles     FORCE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE public.expert_assignments FORCE ROW LEVEL SECURITY;

-- 2) Revoke anon SELECT on tables anon should never read.
REVOKE SELECT ON public.bids               FROM anon;
REVOKE SELECT ON public.offers             FROM anon;
REVOKE SELECT ON public.payments           FROM anon;
REVOKE SELECT ON public.notifications      FROM anon;
REVOKE SELECT ON public.user_roles         FROM anon;
REVOKE SELECT ON public.expert_assignments FROM anon;
REVOKE SELECT ON public.profiles           FROM anon;

-- 3) Revoke ALL write privileges from anon across public schema
--    (RLS already blocks, this is belt-and-suspenders and prevents
--    accidental exposure if a future policy is added).
REVOKE INSERT, UPDATE, DELETE ON public.auctions          FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.auction_events    FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.bids              FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.offers            FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.payments          FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.notifications     FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles        FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.expert_assignments FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.profiles          FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.cars              FROM anon;

-- 4) Hide reserve/floor prices + seller identity from anon (column-level).
--    Anon can still list marketing fields; authenticated users see everything
--    RLS/policies allow.
REVOKE SELECT (minimum_accepted_price, prix_plancher, prix_minimum, vendeur_id)
  ON public.cars FROM anon;

-- 5) Tighten profiles policies: scope INSERT/UPDATE to `authenticated`
--    instead of the broader `public` role (anon should never write here).
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;

CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6) handle_new_user: never trust client-supplied `actif`. Force to false
--    so admin activation is the only path (aligns with inscription-en-attente
--    and admin_list_pending_users). Keep role selection from metadata since
--    that determines UX flow (not privileges — role rows are gated by
--    user_roles RLS + has_role checks).
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role public.app_role;
BEGIN
  v_role := COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'acheteur');

  INSERT INTO public.profiles (user_id, nom, email, telephone, actif)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nom', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'telephone',
    false  -- always inactive on signup; admin must activate
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END; $function$;

-- 7) Hot-path indexes for RPCs that lock/scan under contention.
CREATE INDEX IF NOT EXISTS idx_bids_auction_created
  ON public.bids (auction_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_offers_auction_user
  ON public.offers (auction_id, user_id);
CREATE INDEX IF NOT EXISTS idx_payments_auction_user_type
  ON public.payments (auction_id, user_id, type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auctions_status_ends
  ON public.auctions (status, ends_at);
CREATE INDEX IF NOT EXISTS idx_auctions_top_bidder
  ON public.auctions (top_bidder_id);
CREATE INDEX IF NOT EXISTS idx_cars_status
  ON public.cars (status);
CREATE INDEX IF NOT EXISTS idx_user_roles_user
  ON public.user_roles (user_id);