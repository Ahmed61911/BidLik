-- ============================================================================
-- Pre-production security audit fixes. Four issues, ordered by severity:
--
-- 1) CRITICAL — handle_new_user() trusted the client-supplied `role` in
--    signup metadata verbatim. Any direct call to the Auth signup endpoint
--    (bypassing the app's own role-limited UI) could set role: 'admin' or
--    'expert' and immediately pass every has_role(admin) check in the
--    system — a full unauthenticated-to-admin privilege escalation. Public
--    self-registration may now only ever grant 'acheteur' or 'vendeur'.
--
-- 2) CRITICAL — public.cars had a table-wide UPDATE grant to `authenticated`.
--    RLS (cars_update_owner_or_admin) correctly restricts WHICH ROWS a
--    vendeur/assigned-expert can touch, but nothing restricted WHICH COLUMNS
--    — a car's own vendeur could PATCH payment_status/delivery_status/status
--    /opposition/main_levee/carte_grise_barree directly via PostgREST,
--    bypassing admin_set_payment_status()'s validation entirely (defeating
--    the point of 20260711090200's admin-only payment hardening). Column
--    grants now restrict authenticated writes to exactly the fields the
--    app's own code legitimately writes directly (verified: vendeur has NO
--    direct cars.update() call anywhere; only the expert-report flow in
--    src/lib/supabaseExpertApi.ts does, for these 11 columns). Every
--    admin/RPC-only column (status, payment_status, delivery_status,
--    note_expert, price fields, legal flags, vendeur_id, etc.) is now only
--    writable through SECURITY DEFINER functions, which run as the function
--    owner and are unaffected by this column-level REVOKE.
--
-- 3) HIGH — submit_expert_report() checked has_role(expert) but never that
--    the caller was the *assigned* expert for that specific car — any
--    registered expert could overwrite any other expert's report.
--
-- 4) MEDIUM — get_my_won_car_details()'s access check used IS DISTINCT FROM,
--    which is false when both sides are NULL. For any closed auction with
--    no bids (top_bidder_id IS NULL), an anonymous caller (auth.uid() IS
--    NULL) slipped through and received vendeur_nom + payment/delivery
--    status for that car.
--
-- Plus two low-severity hardening/hygiene items: explicit anon/PUBLIC
-- REVOKE on admin_refund_caution/broadcast_announcement (has_role check
-- already blocked non-admins; this just matches the project's own
-- established defense-in-depth pattern), and dropping a dead, superseded
-- 5-arg admin_refund_caution overload.
-- ============================================================================

-- 1) Self-registration can only ever grant acheteur/vendeur.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role public.app_role;
BEGIN
  v_role := (NEW.raw_user_meta_data->>'role')::public.app_role;
  IF v_role IS NULL OR v_role NOT IN ('acheteur', 'vendeur') THEN
    v_role := 'acheteur';
  END IF;

  INSERT INTO public.profiles (user_id, nom, email, telephone, actif)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nom', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data->>'telephone',
    false  -- always inactive on signup; admin must activate
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END; $function$;

-- 2) Column-level lockdown on cars — see header comment for rationale.
REVOKE UPDATE ON public.cars FROM authenticated;
GRANT UPDATE (
  marque, modele, annee, kilometrage, body_type, transmission, carburant,
  couleur_exterieur, couleur_interieur, expert_images, images
) ON public.cars TO authenticated;

-- 3) submit_expert_report(): admin bypasses; a plain "expert" role must own
-- the assignment for this specific car.
CREATE OR REPLACE FUNCTION public.submit_expert_report(
  p_car_id text,
  p_note integer,
  p_commentaire text DEFAULT NULL::text,
  p_checklist jsonb DEFAULT NULL::jsonb,
  p_rapport_url text DEFAULT NULL::text,
  p_rapport_name text DEFAULT NULL::text
)
RETURNS public.expert_assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE r public.expert_assignments;
BEGIN
  IF public.has_role(auth.uid(),'admin') THEN
    NULL; -- admins may submit/override any report
  ELSIF public.has_role(auth.uid(),'expert') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.expert_assignments
      WHERE car_id = p_car_id AND expert_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'Cette inspection ne vous est pas assignée';
    END IF;
  ELSE
    RAISE EXCEPTION 'Réservé aux experts';
  END IF;

  IF p_note < 0 OR p_note > 10 THEN RAISE EXCEPTION 'La note doit être entre 0 et 10'; END IF;
  UPDATE public.expert_assignments
     SET status = 'rapport_recu',
         note_finale = p_note,
         rapport_recu_le = now(),
         commentaire = COALESCE(p_commentaire, commentaire),
         checklist = COALESCE(p_checklist, checklist),
         rapport_url = COALESCE(NULLIF(p_rapport_url,''), rapport_url),
         rapport_name = COALESCE(NULLIF(p_rapport_name,''), rapport_name)
   WHERE car_id = p_car_id
   RETURNING * INTO r;
  IF r IS NULL THEN RAISE EXCEPTION 'Assignation introuvable'; END IF;
  UPDATE public.cars SET note_expert = p_note, status = 'expertise' WHERE id = p_car_id;
  RETURN r;
END $function$;

-- 4) get_my_won_car_details(): reject an anonymous/unauthenticated caller
-- outright, instead of relying on IS DISTINCT FROM against a possibly-NULL
-- top_bidder_id.
CREATE OR REPLACE FUNCTION public.get_my_won_car_details(p_auction_id text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_auction public.auctions;
  v_car public.cars;
BEGIN
  SELECT * INTO v_auction FROM public.auctions WHERE id = p_auction_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Enchère introuvable'; END IF;
  IF auth.uid() IS NULL OR (
       v_auction.top_bidder_id IS DISTINCT FROM auth.uid()
       AND NOT public.has_role(auth.uid(),'admin')
     ) THEN
    RAISE EXCEPTION 'Accès refusé';
  END IF;
  SELECT * INTO v_car FROM public.cars WHERE id = v_auction.car_id;

  RETURN jsonb_build_object(
    'auction', jsonb_build_object(
      'id', v_auction.id,
      'status', v_auction.status,
      'current_price', v_auction.current_price,
      'starting_price', v_auction.starting_price,
      'starts_at', v_auction.starts_at,
      'ends_at', v_auction.ends_at,
      'closed_at', v_auction.closed_at,
      'validated_at', v_auction.validated_at,
      'payment_deadline', v_auction.payment_deadline,
      'bid_count', v_auction.bid_count,
      'auction_type', v_auction.auction_type,
      'visibility', v_auction.visibility
    ),
    'car', jsonb_build_object(
      'id', v_car.id,
      'marque', v_car.marque,
      'modele', v_car.modele,
      'annee', v_car.annee,
      'finition', v_car.finition,
      'kilometrage', v_car.kilometrage,
      'transmission', v_car.transmission,
      'carburant', v_car.carburant,
      'couleur_exterieur', v_car.couleur_exterieur,
      'couleur_interieur', v_car.couleur_interieur,
      'puissance_fiscale', v_car.puissance_fiscale,
      'nombre_cles', v_car.nombre_cles,
      'procuration', v_car.procuration,
      'body_type', v_car.body_type,
      'note_expert', v_car.note_expert,
      'status', v_car.status,
      'payment_status', v_car.payment_status,
      'delivery_status', v_car.delivery_status,
      'images', v_car.images,
      'vendeur_nom', v_car.vendeur_nom
    )
  );
END $$;

-- 5) Hardening/hygiene: explicit anon/PUBLIC revoke to match the project's
-- established pattern (has_role already blocked non-admins either way), and
-- drop the dead, superseded 5-arg admin_refund_caution overload.
DROP FUNCTION IF EXISTS public.admin_refund_caution(uuid, text, text, text, text);

REVOKE ALL ON FUNCTION public.admin_refund_caution(uuid, text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_refund_caution(uuid, text, text, text, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.broadcast_announcement(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.broadcast_announcement(text, text, text) TO authenticated;
