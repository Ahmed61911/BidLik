-- 1. Remove anon SELECT on auctions & cars (findings: auctions_top_bidder_public, cars_sensitive_fields_public)
DROP POLICY IF EXISTS auctions_select_anon ON public.auctions;
DROP POLICY IF EXISTS cars_select_anon ON public.cars;
REVOKE SELECT ON public.auctions FROM anon;
REVOKE SELECT ON public.cars FROM anon;

-- 2. Lock down SECURITY DEFINER functions from anon + non-privileged roles
-- (findings: SUPA_anon_security_definer_function_executable, SUPA_authenticated_security_definer_function_executable)

-- Trigger-only helpers: no direct callers
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_expert_assignment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_bid() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_auction_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.stamp_auction_closure() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tick_auctions() FROM PUBLIC, anon;

-- Admin-only RPCs: revoke from anon (has_role check inside still enforces admin)
REVOKE ALL ON FUNCTION public.admin_set_user_active(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_pending_users() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_delete_payment(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_payment_status(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_upsert_payment(uuid, uuid, text, integer, text, text, text, text, text, text, text, timestamptz, text, text, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_payments() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_profiles() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_get_profile(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.validate_auction(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.assign_expert(text, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_expert_report(text, integer) FROM PUBLIC, anon;

-- Authenticated-user RPCs: revoke anon only
REVOKE ALL ON FUNCTION public.place_bid(text, integer, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_offer(text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.buyer_submit_payment(text, integer, text, text, text, text, text, text, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_profile() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_my_account_active() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_auction_bids(text) FROM PUBLIC, anon;

-- Re-grant explicit EXECUTE to authenticated for the RPCs it legitimately needs
GRANT EXECUTE ON FUNCTION public.place_bid(text, integer, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_offer(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buyer_submit_payment(text, integer, text, text, text, text, text, text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_my_account_active() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_auction_bids(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tick_auctions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_active(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_pending_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_payment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_payment_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_upsert_payment(uuid, uuid, text, integer, text, text, text, text, text, text, text, timestamptz, text, text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_payments() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_auction(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_expert(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_expert_report(text, integer) TO authenticated;