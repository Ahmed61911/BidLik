-- Fixes real-time bid broadcast, which has never actually worked:
--
-- 1. public.bids never had a table-level SELECT grant to `authenticated`
--    at all (only INSERT/UPDATE/DELETE — see 20260625154519). Realtime's
--    postgres_cdc_rls extension re-evaluates each subscriber's own
--    role/RLS before delivering a changed row over the websocket, and that
--    check fails closed without an underlying GRANT, regardless of RLS.
-- 2. Even with the grant, bids_select_own_or_admin only allowed a user to
--    see their OWN bids — meaning a bid placed by someone else could never
--    be broadcast to a different buyer watching the same auction, so
--    "you've been outbid" could never arrive in real time; only a refresh
--    (which goes through the SECURITY DEFINER list_auction_bids RPC
--    instead of direct table access) would reveal the new price/leader.
--
-- This intentionally widens row visibility to "any authenticated user can
-- see any bid" (amount/time/auction — the same data list_auction_bids()
-- already exposes to everyone). It does NOT expose other bidders'
-- identity: that's still masked (bidder_name -> "Anonyme" for bids that
-- aren't the caller's own) — but only in the RPC used for the initial
-- fetch. Realtime broadcasts the raw row including the real bidder_name,
-- so the frontend must re-mask it for realtime-delivered bids itself (see
-- src/routes/auctions.$auctionId.tsx) — the underlying bidder_id is still
-- needed unmasked there to compute "is this my bid" for the outbid banner.
GRANT SELECT ON public.bids TO authenticated;

DROP POLICY IF EXISTS bids_select_own_or_admin ON public.bids;
CREATE POLICY bids_select_authenticated ON public.bids
  FOR SELECT TO authenticated
  USING (true);
