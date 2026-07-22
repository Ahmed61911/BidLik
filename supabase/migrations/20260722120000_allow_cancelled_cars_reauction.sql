-- Cars whose sale fell through (status vendu_annulee — "Annulée": either the
-- car itself was flagged cancelled, or its auction was cancelled per
-- deriveStage() in supabaseVendeurApi.ts) should be re-listable for auction,
-- same as fresh expertise-ready cars. They already passed expertise once
-- (rapport_recu) to have been auctioned in the first place, so the same
-- ea.status = 'rapport_recu' guard still applies — only the allowed car
-- status set needs widening, matching the equivalent client-side guards in
-- createAuctionFromCar()/createMultiCarEvent() (src/lib/supabaseAdminApi.ts).
CREATE OR REPLACE FUNCTION public.admin_list_expertise_ready()
RETURNS TABLE(car cars, note_finale integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Réservé aux administrateurs';
  END IF;
  RETURN QUERY
    SELECT c, ea.note_finale
    FROM public.expert_assignments ea
    JOIN public.cars c ON c.id = ea.car_id
    WHERE ea.status = 'rapport_recu' AND c.status IN ('open', 'expertise', 'vendu_annulee');
END $function$;
