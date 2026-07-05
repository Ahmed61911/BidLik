
-- =========================================================
-- 1) auctions: hide top_bidder_id from anon + authenticated
-- =========================================================
REVOKE SELECT ON public.auctions FROM anon, authenticated;

GRANT SELECT (
  id, car_id, event_id, starts_at, ends_at,
  starting_price, current_price, bid_count,
  status, visibility, auction_type,
  closed_at, admin_validation_deadline, validated_at,
  payment_deadline, created_at, updated_at
) ON public.auctions TO anon, authenticated;

-- Admin/service still have full access via SECURITY DEFINER RPCs and service_role
GRANT ALL ON public.auctions TO service_role;

-- =========================================================
-- 2) cars: hide seller identity, reserve/floor prices,
--    and internal operational flags from anon + authenticated
-- =========================================================
REVOKE SELECT ON public.cars FROM anon, authenticated;

GRANT SELECT (
  id, type, marque, modele, finition, transmission, carburant,
  annee, kilometrage, couleur_exterieur, couleur_interieur,
  note_expert, nombre_cles, puissance_fiscale, carte_grise_barree,
  procuration, date_vente, status, images, body_type,
  created_at, updated_at
) ON public.cars TO anon, authenticated;

-- authenticated still needs INSERT/UPDATE for own-seller flows (RLS enforces ownership)
GRANT INSERT, UPDATE, DELETE ON public.cars TO authenticated;
GRANT ALL ON public.cars TO service_role;

-- =========================================================
-- 3) Revoke EXECUTE on internal trigger/cron SECURITY DEFINER
--    functions from anon/authenticated/PUBLIC. Triggers and
--    pg_cron run as table owner and are unaffected.
-- =========================================================
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'public.handle_new_user()',
    'public.notify_on_bid()',
    'public.notify_on_auction_status()',
    'public.stamp_auction_closure()',
    'public.ensure_expert_assignment()',
    'public.set_updated_at()',
    'public.tick_auctions()',
    'public.storage_can_write_car_image(text)',
    'public.storage_can_write_payment_proof_auction(text)',
    'public.storage_can_write_payment_proof_caution(text)',
    'public.storage_can_write_payment_proof_car_payment(text)'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;
