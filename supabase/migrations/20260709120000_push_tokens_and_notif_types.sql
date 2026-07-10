-- ============================================================================
-- Mobile push notification infrastructure (part 1/3) — see mobile app
-- architecture plan §2. Additive only; nothing existing is modified here.
-- ============================================================================

-- ============ DEVICE PUSH TOKENS ============
-- One row per (user, device). expo_push_token is globally unique — a device
-- moving to a new account reassigns the row via register_push_token() rather
-- than accumulating stale duplicates.
CREATE TABLE public.device_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_push_token TEXT NOT NULL UNIQUE,
  platform TEXT NOT NULL CHECK (platform IN ('ios','android')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_device_push_tokens_user ON public.device_push_tokens(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_push_tokens TO authenticated;
GRANT ALL ON public.device_push_tokens TO service_role;
ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;

-- Table-level RLS as defense-in-depth; normal clients always go through the
-- register_push_token/unregister_push_token RPCs below.
CREATE POLICY device_push_tokens_select_own ON public.device_push_tokens
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY device_push_tokens_insert_own ON public.device_push_tokens
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY device_push_tokens_update_own ON public.device_push_tokens
  FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY device_push_tokens_delete_own ON public.device_push_tokens
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER device_push_tokens_set_updated_at BEFORE UPDATE ON public.device_push_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- SECURITY DEFINER: the ON CONFLICT branch can reassign a token row that
-- currently belongs to a different user_id (device changed owner/account) —
-- plain RLS would block that UPDATE. Still safe: user_id is always auth.uid()
-- internally, so a caller can only ever claim rows under their own identity,
-- never write arbitrary data for another user.
CREATE OR REPLACE FUNCTION public.register_push_token(p_token TEXT, p_platform TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_token IS NULL OR length(p_token) = 0 THEN
    RAISE EXCEPTION 'Jeton push manquant';
  END IF;
  IF p_platform NOT IN ('ios','android') THEN
    RAISE EXCEPTION 'Plateforme invalide';
  END IF;
  INSERT INTO public.device_push_tokens (user_id, expo_push_token, platform)
  VALUES (auth.uid(), p_token, p_platform)
  ON CONFLICT (expo_push_token) DO UPDATE
    SET user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
END $$;

CREATE OR REPLACE FUNCTION public.unregister_push_token(p_token TEXT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.device_push_tokens WHERE expo_push_token = p_token AND user_id = auth.uid();
END $$;

-- ============ NOTIFICATION TYPES ============
-- Extends the type list beyond what the webapp currently emits, to cover the
-- full mobile notification set. New values only become usable in a later
-- transaction (Postgres restriction on ALTER TYPE ... ADD VALUE) — the
-- triggers that emit them live in the next migration file.
ALTER TYPE public.notif_type_t ADD VALUE IF NOT EXISTS 'auction_starting';
ALTER TYPE public.notif_type_t ADD VALUE IF NOT EXISTS 'payment_approved';
ALTER TYPE public.notif_type_t ADD VALUE IF NOT EXISTS 'payment_rejected';
ALTER TYPE public.notif_type_t ADD VALUE IF NOT EXISTS 'vehicle_ready';
ALTER TYPE public.notif_type_t ADD VALUE IF NOT EXISTS 'announcement';
