-- Fix restrictive "block direct writes" policies on bids and offers.
-- Original policies used FOR ALL with USING(false), which also blocked SELECT
-- and made /acheteur/encheres show 0 rows (buyers couldn't read their own bids).

DROP POLICY IF EXISTS bids_block_direct_writes ON public.bids;
CREATE POLICY bids_block_direct_insert ON public.bids
  AS RESTRICTIVE FOR INSERT TO public WITH CHECK (false);
CREATE POLICY bids_block_direct_update ON public.bids
  AS RESTRICTIVE FOR UPDATE TO public USING (false) WITH CHECK (false);
CREATE POLICY bids_block_direct_delete ON public.bids
  AS RESTRICTIVE FOR DELETE TO public USING (false);

DROP POLICY IF EXISTS offers_block_direct_writes ON public.offers;
CREATE POLICY offers_block_direct_insert ON public.offers
  AS RESTRICTIVE FOR INSERT TO public WITH CHECK (false);
CREATE POLICY offers_block_direct_update ON public.offers
  AS RESTRICTIVE FOR UPDATE TO public USING (false) WITH CHECK (false);
CREATE POLICY offers_block_direct_delete ON public.offers
  AS RESTRICTIVE FOR DELETE TO public USING (false);
