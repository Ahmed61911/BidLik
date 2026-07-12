-- Reinstates expertise report/photo visibility for the acheteur role on the
-- live auction page (auctions.$auctionId.tsx), which is shared unmodified
-- across acheteur/vendeur/admin — so restricting the RPC to admin/vendeur/
-- assigned-expert (20260706150000, 20260711090000) meant acheteur silently
-- got a degraded version of the same page. Per product decision, acheteur
-- should see the same expertise info as the other roles. The winner-only
-- carve-out from 20260711100000 is now redundant (a winner is still an
-- acheteur) but left in place for clarity/no-op safety.
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
                OR public.has_role(auth.uid(),'acheteur')
              THEN ea.rapport_url ELSE NULL END AS rapport_url,
         CASE WHEN public.has_role(auth.uid(),'admin')
                OR c.vendeur_id = auth.uid()
                OR ea.expert_id = auth.uid()
                OR public.has_role(auth.uid(),'acheteur')
              THEN ea.rapport_name ELSE NULL END AS rapport_name,
         ea.rapport_recu_le,
         CASE WHEN public.has_role(auth.uid(),'admin')
                OR c.vendeur_id = auth.uid()
                OR ea.expert_id = auth.uid()
                OR public.has_role(auth.uid(),'acheteur')
              THEN c.expert_images ELSE NULL END AS expert_images
  FROM public.expert_assignments ea
  JOIN public.cars c ON c.id = ea.car_id
  WHERE ea.car_id = p_car_id AND ea.status = 'rapport_recu'
  LIMIT 1;
$function$;
