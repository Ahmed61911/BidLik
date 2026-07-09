-- The acheteur store (src/lib/supabaseAcheteurStore.ts) subscribes to
-- postgres_changes on public.payments to reflect caution/deposit status
-- ("en attente" -> "validée") the moment an admin or a submission changes it.
-- That subscription was silently a no-op: unlike bids/auctions/offers/
-- notifications, payments was never added to the supabase_realtime
-- publication, so Postgres never emitted change events for it. The only
-- way the UI ever picked up a new payment row was via an unrelated realtime
-- event on another table happening to trigger the same refreshAll(), or the
-- user signing out/in again (which forces a full refetch) — matching the
-- reported "shows up after a while, or after reconnecting" symptom exactly.
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER TABLE public.payments REPLICA IDENTITY FULL;
