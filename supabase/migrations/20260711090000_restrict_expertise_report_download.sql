-- The expertise report PDF (rapport_url/rapport_name) was returned
-- unconditionally to anyone calling get_car_expertise() — including any
-- acheteur, on both the live-auction page and the won-car detail page —
-- even though expert_images already got the admin/vendeur/assigned-expert
-- gate in 20260706150000. Apply the same restriction to the report fields:
-- checklist/note/comment stay public (marketing info), the actual report
-- download and photos are now both admin/vendeur/assigned-expert only.
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
         CASE WHEN public.has_role(auth.uid(),'admin')
                OR c.vendeur_id = auth.uid()
                OR ea.expert_id = auth.uid()
              THEN ea.rapport_url ELSE NULL END AS rapport_url,
         CASE WHEN public.has_role(auth.uid(),'admin')
                OR c.vendeur_id = auth.uid()
                OR ea.expert_id = auth.uid()
              THEN ea.rapport_name ELSE NULL END AS rapport_name,
         ea.rapport_recu_le,
         CASE WHEN public.has_role(auth.uid(),'admin')
                OR c.vendeur_id = auth.uid()
                OR ea.expert_id = auth.uid()
              THEN c.expert_images ELSE NULL END AS expert_images
  FROM public.expert_assignments ea
  JOIN public.cars c ON c.id = ea.car_id
  WHERE ea.car_id = p_car_id AND ea.status = 'rapport_recu'
  LIMIT 1;
$function$;
