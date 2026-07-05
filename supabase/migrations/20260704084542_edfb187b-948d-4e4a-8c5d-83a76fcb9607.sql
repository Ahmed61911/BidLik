
ALTER TABLE public.expert_assignments
  ADD COLUMN IF NOT EXISTS commentaire text,
  ADD COLUMN IF NOT EXISTS checklist jsonb,
  ADD COLUMN IF NOT EXISTS rapport_url text,
  ADD COLUMN IF NOT EXISTS rapport_name text;

DROP FUNCTION IF EXISTS public.submit_expert_report(text, integer);

CREATE OR REPLACE FUNCTION public.submit_expert_report(
  p_car_id text,
  p_note integer,
  p_commentaire text DEFAULT NULL,
  p_checklist jsonb DEFAULT NULL,
  p_rapport_url text DEFAULT NULL,
  p_rapport_name text DEFAULT NULL
)
RETURNS public.expert_assignments
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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
  UPDATE public.cars SET note_expert = p_note WHERE id = p_car_id;
  RETURN r;
END $function$;

CREATE OR REPLACE FUNCTION public.get_car_expertise(p_car_id text)
RETURNS TABLE(
  note_finale integer,
  commentaire text,
  checklist jsonb,
  rapport_url text,
  rapport_name text,
  rapport_recu_le timestamptz,
  expert_images jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT ea.note_finale, ea.commentaire, ea.checklist,
         ea.rapport_url, ea.rapport_name, ea.rapport_recu_le,
         CASE WHEN public.has_role(auth.uid(),'admin')
                OR public.has_role(auth.uid(),'acheteur')
              THEN c.expert_images ELSE NULL END AS expert_images
  FROM public.expert_assignments ea
  JOIN public.cars c ON c.id = ea.car_id
  WHERE ea.car_id = p_car_id AND ea.status = 'rapport_recu'
  LIMIT 1;
$function$;

GRANT EXECUTE ON FUNCTION public.get_car_expertise(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_expert_report(text, integer, text, jsonb, text, text) TO authenticated;
