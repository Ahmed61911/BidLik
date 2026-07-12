-- get_car_expertise() gates rapport_url/rapport_name/expert_images to
-- admin/vendeur/assigned-expert (20260711090000) -- correct for the live
-- auction page (bidders shouldn't see the internal report before winning),
-- but this also blocked the AUCTION WINNER from seeing it on their own
-- won-car page (acheteur.gagnees.$auctionId.tsx), which calls this same RPC.
-- Add the winning bidder as a fourth allowed party, same check
-- get_my_won_car_details() already uses (top_bidder_id = auth.uid()).
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
                OR EXISTS (SELECT 1 FROM public.auctions a WHERE a.car_id = c.id AND a.top_bidder_id = auth.uid())
              THEN ea.rapport_url ELSE NULL END AS rapport_url,
         CASE WHEN public.has_role(auth.uid(),'admin')
                OR c.vendeur_id = auth.uid()
                OR ea.expert_id = auth.uid()
                OR EXISTS (SELECT 1 FROM public.auctions a WHERE a.car_id = c.id AND a.top_bidder_id = auth.uid())
              THEN ea.rapport_name ELSE NULL END AS rapport_name,
         ea.rapport_recu_le,
         CASE WHEN public.has_role(auth.uid(),'admin')
                OR c.vendeur_id = auth.uid()
                OR ea.expert_id = auth.uid()
                OR EXISTS (SELECT 1 FROM public.auctions a WHERE a.car_id = c.id AND a.top_bidder_id = auth.uid())
              THEN c.expert_images ELSE NULL END AS expert_images
  FROM public.expert_assignments ea
  JOIN public.cars c ON c.id = ea.car_id
  WHERE ea.car_id = p_car_id AND ea.status = 'rapport_recu'
  LIMIT 1;
$function$;
