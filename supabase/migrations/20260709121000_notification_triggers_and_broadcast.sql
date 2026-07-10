-- ============================================================================
-- Mobile push notification infrastructure (part 2/3) — new trigger functions
-- that emit the notif_type_t values added in the previous migration. Every
-- existing trigger/RPC (notify_on_bid, notify_on_auction_status,
-- admin_validate_caution, admin_refund_caution) is left untouched.
-- ============================================================================

-- ============ AUCTION STARTING ============
-- Recipient scope: every eligible bidder (acheteur role, caution validée) for
-- public ("ouvert") auctions. There is no watchlist/follow feature in the
-- schema yet, so this is the broadest reasonable default — narrow this to
-- actual followers once a watchlist table exists.
CREATE OR REPLACE FUNCTION public.notify_on_auction_starting()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_car public.cars;
BEGIN
  IF NOT (OLD.status = 'scheduled' AND NEW.status = 'live') THEN RETURN NEW; END IF;
  IF NEW.visibility <> 'ouvert' THEN RETURN NEW; END IF;

  SELECT * INTO v_car FROM public.cars WHERE id = NEW.car_id;

  INSERT INTO public.notifications (user_id, type, titre, message, auction_id)
  SELECT p.user_id, 'auction_starting', 'Une enchère démarre',
    COALESCE(v_car.marque,'') || ' ' || COALESCE(v_car.modele,'') || ' est maintenant en vente.',
    NEW.id
  FROM public.profiles p
  WHERE p.caution_validee = true
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.user_id AND ur.role = 'acheteur'::public.app_role
    );
  RETURN NEW;
END $$;

CREATE TRIGGER trg_notify_on_auction_starting AFTER UPDATE OF status ON public.auctions
FOR EACH ROW EXECUTE FUNCTION public.notify_on_auction_starting();

-- ============ PAYMENT APPROVED / REJECTED ============
-- Scoped to type='achat' only — caution payments already have their own
-- dedicated 'caution' notifications from admin_validate_caution /
-- admin_refund_caution, so this intentionally does not touch type='caution'
-- to avoid double-notifying that already-working flow.
--
-- Known tradeoff: admin_set_payment_status() also inserts a generic 'system'
-- notification for every 'achat' status change (any status, not just
-- paye/annule). That existing insert is left untouched to avoid modifying
-- tested admin logic sight-unseen — so an 'achat' payment approved/rejected
-- via admin_set_payment_status currently produces two notifications (one
-- generic 'system', one specific 'payment_approved'/'payment_rejected' from
-- this trigger). Payments approved/rejected via admin_upsert_payment (which
-- has no notification logic at all today) get exactly one, correctly-typed
-- notification. Worth revisiting admin_set_payment_status in a follow-up to
-- drop its inline insert now that this trigger covers it.
CREATE OR REPLACE FUNCTION public.notify_on_payment_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_car public.cars;
BEGIN
  IF NEW.type <> 'achat' THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('paye','annule') THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;

  IF NEW.car_id IS NOT NULL THEN
    SELECT * INTO v_car FROM public.cars WHERE id = NEW.car_id;
  END IF;

  INSERT INTO public.notifications (user_id, type, titre, message, auction_id)
  VALUES (
    NEW.user_id,
    CASE WHEN NEW.status = 'paye' THEN 'payment_approved' ELSE 'payment_rejected' END,
    CASE WHEN NEW.status = 'paye' THEN 'Paiement approuvé' ELSE 'Paiement rejeté' END,
    CASE WHEN NEW.status = 'paye'
      THEN 'Votre paiement pour ' || COALESCE(v_car.marque,'') || ' ' || COALESCE(v_car.modele,'') || ' a été approuvé.'
      ELSE 'Votre paiement pour ' || COALESCE(v_car.marque,'') || ' ' || COALESCE(v_car.modele,'') || ' a été rejeté. Contactez le support.'
    END,
    NEW.auction_id
  );
  RETURN NEW;
END $$;

CREATE TRIGGER trg_notify_on_payment_status AFTER INSERT OR UPDATE OF status ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_payment_status();

-- ============ VEHICLE READY ============
-- Fires when a car's delivery_status flips to 'livre' (ready for pickup /
-- delivered). Notifies the buyer of record: the top_bidder_id of that car's
-- validated auction.
CREATE OR REPLACE FUNCTION public.notify_on_vehicle_ready()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_auction public.auctions;
BEGIN
  IF NOT (OLD.delivery_status = 'non_livre' AND NEW.delivery_status = 'livre') THEN RETURN NEW; END IF;

  SELECT * INTO v_auction FROM public.auctions
    WHERE car_id = NEW.id AND status = 'validated'
    ORDER BY validated_at DESC NULLS LAST LIMIT 1;
  IF v_auction.id IS NULL OR v_auction.top_bidder_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (user_id, type, titre, message, auction_id)
  VALUES (v_auction.top_bidder_id, 'vehicle_ready', 'Véhicule prêt',
    COALESCE(NEW.marque,'') || ' ' || COALESCE(NEW.modele,'') || ' est prêt pour la livraison / le retrait.',
    v_auction.id);
  RETURN NEW;
END $$;

CREATE TRIGGER trg_notify_on_vehicle_ready AFTER UPDATE OF delivery_status ON public.cars
FOR EACH ROW EXECUTE FUNCTION public.notify_on_vehicle_ready();

-- ============ ADMIN BROADCAST ANNOUNCEMENT ============
CREATE OR REPLACE FUNCTION public.broadcast_announcement(
  p_title TEXT, p_message TEXT, p_audience TEXT DEFAULT 'all'
) RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs';
  END IF;
  IF p_audience NOT IN ('all','acheteur','vendeur') THEN
    RAISE EXCEPTION 'Audience invalide';
  END IF;
  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RAISE EXCEPTION 'Titre requis';
  END IF;

  WITH recipients AS (
    SELECT DISTINCT ur.user_id
    FROM public.user_roles ur
    WHERE p_audience = 'all' OR ur.role::text = p_audience
  ),
  inserted AS (
    INSERT INTO public.notifications (user_id, type, titre, message)
    SELECT user_id, 'announcement', p_title, p_message FROM recipients
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM inserted;

  RETURN v_count;
END $$;
