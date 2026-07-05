
-- =====================================================================
-- Security hardening migration
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) cars / auctions: stop anon from reading sensitive columns
--    Keep the anon SELECT policy (so public browsing still works) but
--    use column-level GRANTs so PostgREST only returns safe columns.
-- ---------------------------------------------------------------------
REVOKE SELECT ON public.cars FROM anon;
GRANT SELECT (
  id, type, vendeur_nom, marque, modele, finition, transmission, carburant,
  annee, kilometrage, couleur_exterieur, couleur_interieur, note_expert,
  nombre_cles, puissance_fiscale, body_type, status, date_vente,
  prix_attendu, images, created_at, updated_at
) ON public.cars TO anon;

REVOKE SELECT ON public.auctions FROM anon;
GRANT SELECT (
  id, event_id, car_id, status, auction_type, visibility,
  starts_at, ends_at, current_price, starting_price, bid_count,
  created_at, updated_at
) ON public.auctions TO anon;

-- ---------------------------------------------------------------------
-- 2) bids / offers: add explicit RESTRICTIVE policies blocking direct
--    writes from clients. Writes must go through SECURITY DEFINER RPCs
--    (place_bid / submit_offer) which run as the function owner and
--    bypass RLS. This makes the fail-closed state explicit and
--    future-proof against an accidental permissive policy.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS bids_block_direct_writes ON public.bids;
CREATE POLICY bids_block_direct_writes ON public.bids
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS offers_block_direct_writes ON public.offers;
CREATE POLICY offers_block_direct_writes ON public.offers
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- ---------------------------------------------------------------------
-- 3) user_roles: hard-block direct writes from non-admin clients.
--    Only admins (via the existing user_roles_admin_all permissive
--    policy) can write. This prevents any future permissive INSERT
--    policy from accidentally allowing self-grant of admin role.
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS user_roles_block_non_admin_writes ON public.user_roles;
CREATE POLICY user_roles_block_non_admin_writes ON public.user_roles
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ---------------------------------------------------------------------
-- 4) SECURITY DEFINER functions: revoke broad EXECUTE from PUBLIC,
--    then grant only to the roles that should call each function.
-- ---------------------------------------------------------------------

-- Trigger / cron functions: no client should ever call these.
REVOKE ALL ON FUNCTION public.tick_auctions()                FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user()              FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at()               FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_expert_assignment()     FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.stamp_auction_closure()        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_bid()                FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_auction_status()     FROM PUBLIC, anon, authenticated;

-- RLS helper: must be callable by whoever evaluates a policy that uses it.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;

-- User-facing RPCs: signed-in users only.
REVOKE ALL ON FUNCTION public.place_bid(text, integer, boolean)         FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_bid(text, integer, boolean)      TO authenticated;

REVOKE ALL ON FUNCTION public.submit_offer(text, integer)               FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_offer(text, integer)            TO authenticated;

REVOKE ALL ON FUNCTION public.submit_expert_report(text, integer)       FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_expert_report(text, integer)    TO authenticated;

REVOKE ALL ON FUNCTION public.buyer_submit_payment(text, integer, text, text, text, text, text, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.buyer_submit_payment(text, integer, text, text, text, text, text, text, date) TO authenticated;

REVOKE ALL ON FUNCTION public.list_auction_bids(text)                   FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_auction_bids(text)                TO authenticated;

REVOKE ALL ON FUNCTION public.get_my_profile()                          FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_profile()                       TO authenticated;

REVOKE ALL ON FUNCTION public.is_my_account_active()                    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_my_account_active()                 TO authenticated;

REVOKE ALL ON FUNCTION public.assign_expert(text, uuid)                 FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assign_expert(text, uuid)              TO authenticated;

-- Admin-only RPCs (self-checked inside): grant to authenticated only.
REVOKE ALL ON FUNCTION public.admin_set_payment_status(uuid, text)      FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_payment_status(uuid, text)   TO authenticated;

REVOKE ALL ON FUNCTION public.validate_auction(text, text)              FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.validate_auction(text, text)           TO authenticated;

REVOKE ALL ON FUNCTION public.admin_set_user_active(uuid, boolean)      FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_active(uuid, boolean)   TO authenticated;

REVOKE ALL ON FUNCTION public.admin_delete_payment(uuid)                FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_payment(uuid)             TO authenticated;

REVOKE ALL ON FUNCTION public.admin_list_pending_users()                FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_pending_users()             TO authenticated;

REVOKE ALL ON FUNCTION public.admin_list_payments()                     FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_payments()                  TO authenticated;

REVOKE ALL ON FUNCTION public.admin_list_profiles()                     FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles()                  TO authenticated;

REVOKE ALL ON FUNCTION public.admin_get_profile(uuid)                   FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_get_profile(uuid)                TO authenticated;

REVOKE ALL ON FUNCTION public.admin_upsert_payment(uuid, uuid, text, integer, text, text, text, text, text, text, text, timestamptz, text, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_upsert_payment(uuid, uuid, text, integer, text, text, text, text, text, text, text, timestamptz, text, text, date) TO authenticated;
