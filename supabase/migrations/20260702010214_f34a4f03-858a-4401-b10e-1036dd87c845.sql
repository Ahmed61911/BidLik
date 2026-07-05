-- Fix: the restrictive policy on user_roles was covering ALL commands (including SELECT),
-- which blocked non-admin users from reading their own role rows. As a result every
-- non-admin session fell back to the default 'acheteur' role in the client.
-- Replace it with restrictive policies scoped to write commands only, keeping the
-- existing permissive "select own or admin" policy in place for reads.

DROP POLICY IF EXISTS user_roles_block_non_admin_writes ON public.user_roles;

CREATE POLICY user_roles_block_non_admin_insert
  ON public.user_roles AS RESTRICTIVE FOR INSERT TO anon, authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY user_roles_block_non_admin_update
  ON public.user_roles AS RESTRICTIVE FOR UPDATE TO anon, authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY user_roles_block_non_admin_delete
  ON public.user_roles AS RESTRICTIVE FOR DELETE TO anon, authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
