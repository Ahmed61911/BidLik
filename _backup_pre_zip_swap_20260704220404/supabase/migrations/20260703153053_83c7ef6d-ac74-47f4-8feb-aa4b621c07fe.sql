CREATE OR REPLACE FUNCTION public.admin_refund_caution(
  p_id uuid,
  p_reference text DEFAULT NULL,
  p_proof_url text DEFAULT NULL,
  p_proof_name text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_payment_method text DEFAULT NULL,
  p_bank text DEFAULT NULL
)
RETURNS payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v public.payments;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs';
  END IF;
  IF p_payment_method IS NULL OR p_payment_method NOT IN ('virement','cheque','especes') THEN
    RAISE EXCEPTION 'Mode de remboursement invalide';
  END IF;
  IF p_proof_url IS NULL OR length(p_proof_url) = 0 THEN
    RAISE EXCEPTION 'Justificatif de remboursement requis';
  END IF;

  SELECT * INTO v FROM public.payments WHERE id = p_id FOR UPDATE;
  IF v.id IS NULL THEN RAISE EXCEPTION 'Paiement introuvable'; END IF;
  IF v.type <> 'caution' THEN RAISE EXCEPTION 'Ce paiement n''est pas une caution'; END IF;
  IF v.status <> 'paye' THEN RAISE EXCEPTION 'Seule une caution validée peut être remboursée'; END IF;

  UPDATE public.payments
    SET status = 'rembourse',
        reference = COALESCE(NULLIF(p_reference,''), reference),
        proof_url = p_proof_url,
        proof_name = COALESCE(NULLIF(p_proof_name,''), proof_name),
        notes = COALESCE(NULLIF(p_notes,''), notes),
        payment_method = p_payment_method,
        bank = COALESCE(NULLIF(p_bank,''), bank),
        updated_at = now()
    WHERE id = p_id RETURNING * INTO v;

  UPDATE public.profiles
    SET caution_validee = false, caution_montant = 0, updated_at = now()
    WHERE user_id = v.user_id;

  INSERT INTO public.notifications (user_id, type, titre, message)
  VALUES (v.user_id, 'caution', 'Caution remboursée',
    'Votre caution de ' || v.amount || ' DH a été remboursée par ' || p_payment_method || '.');

  RETURN v;
END $function$;