-- ============================================================================
-- Restore EXECUTE on the four storage_can_write_* helper functions for
-- `authenticated`.
--
-- Found while investigating "new row violates row-level security policy" on
-- the buyer caution-proof upload. storage-api masks the real underlying
-- Postgres error with that generic message; the actual error (confirmed by
-- calling the function directly as `authenticated`) is:
--   "permission denied for function storage_can_write_payment_proof_caution"
--
-- Root cause: migration 20260704004147 revoked EXECUTE on all four
-- storage.objects RLS helper functions from PUBLIC/anon/authenticated in one
-- blanket loop (alongside genuinely trigger-only functions like
-- handle_new_user/tick_auctions), but — unlike tick_auctions and the other
-- functions in that same hardening pass — nothing ever re-granted EXECUTE
-- back to `authenticated` for these four. Since every storage.objects INSERT
-- policy for car images and payment proofs calls one of these functions in
-- its WITH CHECK clause, this silently broke EVERY authenticated file
-- upload in the app: car photos (sellers), payment proofs (buyers, on
-- winning an auction), and caution proofs (buyers) — not just the caution
-- flow the bug report was about. Same story on the cloud project, since
-- it's the same migration history.
-- ============================================================================

GRANT EXECUTE ON FUNCTION public.storage_can_write_car_image(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.storage_can_write_payment_proof_auction(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.storage_can_write_payment_proof_caution(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.storage_can_write_payment_proof_car_payment(text) TO authenticated;
