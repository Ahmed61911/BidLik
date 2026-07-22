-- notify_on_payment_status() inserted a bare CASE-expression (implicitly typed
-- text) into notifications.type, which is notif_type_t. A single literal gets
-- an implicit unknown-type coercion Postgres accepts, but a CASE expression
-- forces the branches to unify as text first, and text -> notif_type_t has no
-- implicit cast -- every payment status flip to 'paye'/'annule' (achat type)
-- raised "column \"type\" is of type notif_type_t but expression is of type
-- text" and the whole transaction (including admin_set_payment_status calls)
-- aborted. Discovered while seeding test payment data; this is a live bug in
-- the deployed admin payment-verification flow, not just test-data friction.
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
    (CASE WHEN NEW.status = 'paye' THEN 'payment_approved' ELSE 'payment_rejected' END)::public.notif_type_t,
    CASE WHEN NEW.status = 'paye' THEN 'Paiement approuvé' ELSE 'Paiement rejeté' END,
    CASE WHEN NEW.status = 'paye'
      THEN 'Votre paiement pour ' || COALESCE(v_car.marque,'') || ' ' || COALESCE(v_car.modele,'') || ' a été approuvé.'
      ELSE 'Votre paiement pour ' || COALESCE(v_car.marque,'') || ' ' || COALESCE(v_car.modele,'') || ' a été rejeté. Contactez le support.'
    END,
    NEW.auction_id
  );
  RETURN NEW;
END $$;
