-- submit_expert_report(): transition the car itself to 'expertise' once the
-- report lands, so admin.voitures.tsx's "Expertisé" badge (already wired,
-- previously unreachable) actually shows, and vendeurs see accurate status
-- instead of the car looking stuck at "à assigner".
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
  IF NOT public.has_role(auth.uid(),'expert') AND NOT public.has_role(auth.uid(),'admin') THEN
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

-- assign_expert(): the ON CONFLICT path previously reset an already-completed
-- assignment (status/rapport_recu_le/note_finale wiped) if ever invoked twice
-- for the same car. Not reachable from the current admin UI (which only
-- offers assignment for 'non_assigne' cars), but guard it explicitly so a
-- finished inspection can never be silently discarded, keeping the expert
-- association permanently tied to the car once a report exists.
CREATE OR REPLACE FUNCTION public.assign_expert(p_car_id text, p_expert_id uuid)
RETURNS public.expert_assignments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE r public.expert_assignments;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Réservé aux administrateurs'; END IF;
  IF NOT public.has_role(p_expert_id,'expert') THEN RAISE EXCEPTION 'Cet utilisateur n''est pas un expert'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.expert_assignments
    WHERE car_id = p_car_id AND status = 'rapport_recu'
  ) THEN
    RAISE EXCEPTION 'Cette voiture a déjà un rapport d''expertise soumis';
  END IF;
  INSERT INTO public.expert_assignments (car_id, expert_id, status, assigne_le)
  VALUES (p_car_id, p_expert_id, 'en_inspection', now())
  ON CONFLICT (car_id) DO UPDATE
    SET expert_id = EXCLUDED.expert_id, status = 'en_inspection',
        assigne_le = now(), rapport_recu_le = NULL, note_finale = NULL
  RETURNING * INTO r;
  RETURN r;
END $function$;
