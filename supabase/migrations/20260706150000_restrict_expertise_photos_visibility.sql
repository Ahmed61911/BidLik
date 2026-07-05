-- Expertise photos ("Photos d'expertise") were visible to any buyer
-- (has_role 'acheteur') in addition to admin — per updated product
-- requirement, only admin, the car's own vendeur, and its assigned expert
-- should see them now. Checklist/note/comment stay public (unaffected —
-- those are marketing info, not sensitive inspection photos).
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
                OR c.vendeur_id = auth.uid()
                OR ea.expert_id = auth.uid()
              THEN c.expert_images ELSE NULL END AS expert_images
  FROM public.expert_assignments ea
  JOIN public.cars c ON c.id = ea.car_id
  WHERE ea.car_id = p_car_id AND ea.status = 'rapport_recu'
  LIMIT 1;
$function$;
