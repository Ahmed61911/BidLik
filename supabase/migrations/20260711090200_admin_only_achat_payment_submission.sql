-- Per updated product requirement: only admin may record/submit achat
-- (car purchase) payments. Buyers used to submit their own payment proof
-- via buyer_submit_payment() -- revoke it outright so this is enforced at
-- the database layer regardless of what the frontend does or doesn't show.
-- The buyer's payments page stays read-only: what's owed, what's pending
-- verification, and paid history with the admin-recorded proof.
--
-- This does NOT touch buyer_submit_caution()/admin_validate_caution() or
-- anything else on the caution (deposit) flow -- that stays unchanged.
REVOKE EXECUTE ON FUNCTION public.buyer_submit_payment(text, integer, text, text, text, text, text, text, date) FROM authenticated;
