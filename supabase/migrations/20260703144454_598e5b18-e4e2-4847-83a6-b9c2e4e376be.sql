
-- Allow buyers to upload caution proofs (folder = their uid)
CREATE POLICY "payment_proofs_buyer_insert_own"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND (auth.uid())::text = split_part(name, '/', 1)
  );

-- Buyer submits a caution payment with proof
CREATE OR REPLACE FUNCTION public.buyer_submit_caution(
  p_amount integer,
  p_reference text,
  p_proof_url text,
  p_proof_name text,
  p_notes text,
  p_payment_method text,
  p_bank text
) RETURNS public.payments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_pay public.payments;
  v_admin_id UUID;
  v_prof public.profiles;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Connexion requise'; END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Montant invalide'; END IF;
  IF p_proof_url IS NULL OR length(p_proof_url) = 0 THEN
    RAISE EXCEPTION 'Justificatif de paiement requis';
  END IF;
  IF p_payment_method IS NULL OR p_payment_method NOT IN ('virement','cheque','especes') THEN
    RAISE EXCEPTION 'Mode de paiement invalide';
  END IF;

  SELECT * INTO v_prof FROM public.profiles WHERE user_id = v_uid;
  IF v_prof.caution_validee THEN
    RAISE EXCEPTION 'Votre caution est déjà validée.';
  END IF;

  SELECT * INTO v_pay FROM public.payments
    WHERE user_id = v_uid AND type = 'caution'
      AND status IN ('en_attente','annule')
    ORDER BY created_at DESC LIMIT 1 FOR UPDATE;

  IF v_pay.id IS NULL THEN
    INSERT INTO public.payments (
      user_id, type, amount, status,
      reference, proof_url, proof_name, notes, paid_at, recorded_by,
      payment_method, bank
    ) VALUES (
      v_uid, 'caution', p_amount, 'en_attente',
      NULLIF(p_reference,''), p_proof_url, NULLIF(p_proof_name,''),
      NULLIF(p_notes,''), now(), v_uid,
      p_payment_method, NULLIF(p_bank,'')
    ) RETURNING * INTO v_pay;
  ELSE
    UPDATE public.payments SET
      amount = p_amount, status = 'en_attente',
      reference = NULLIF(p_reference,''), proof_url = p_proof_url,
      proof_name = NULLIF(p_proof_name,''), notes = NULLIF(p_notes,''),
      paid_at = now(), recorded_by = v_uid,
      payment_method = p_payment_method, bank = NULLIF(p_bank,''),
      updated_at = now()
    WHERE id = v_pay.id RETURNING * INTO v_pay;
  END IF;

  FOR v_admin_id IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    INSERT INTO public.notifications (user_id, type, titre, message)
    VALUES (v_admin_id, 'system', 'Nouvelle caution à valider',
      COALESCE(v_prof.nom, 'Un acheteur') || ' a soumis une caution de ' || p_amount || ' DH (' || p_payment_method || ') à vérifier.');
  END LOOP;

  RETURN v_pay;
END $$;

-- Admin validates or rejects a caution payment
CREATE OR REPLACE FUNCTION public.admin_validate_caution(
  p_id uuid,
  p_decision text
) RETURNS public.payments
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v public.payments;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs';
  END IF;
  IF p_decision NOT IN ('validee','rejetee') THEN
    RAISE EXCEPTION 'Décision invalide';
  END IF;

  SELECT * INTO v FROM public.payments WHERE id = p_id FOR UPDATE;
  IF v.id IS NULL THEN RAISE EXCEPTION 'Paiement introuvable'; END IF;
  IF v.type <> 'caution' THEN RAISE EXCEPTION 'Ce paiement n''est pas une caution'; END IF;

  IF p_decision = 'validee' THEN
    UPDATE public.payments
      SET status = 'paye', paid_at = COALESCE(paid_at, now()), updated_at = now()
      WHERE id = p_id RETURNING * INTO v;
    UPDATE public.profiles
      SET caution_validee = true, caution_montant = v.amount, updated_at = now()
      WHERE user_id = v.user_id;
    INSERT INTO public.notifications (user_id, type, titre, message)
    VALUES (v.user_id, 'caution', 'Caution validée',
      'Votre caution de ' || v.amount || ' DH a été validée. Vous pouvez enchérir dès maintenant.');
  ELSE
    UPDATE public.payments
      SET status = 'annule', updated_at = now()
      WHERE id = p_id RETURNING * INTO v;
    INSERT INTO public.notifications (user_id, type, titre, message)
    VALUES (v.user_id, 'caution', 'Caution rejetée',
      'Votre dépôt de caution a été rejeté. Merci de contacter le support ou de soumettre un nouveau justificatif.');
  END IF;

  RETURN v;
END $$;
