-- Regression from 20260706160000 (submit_expert_report now transitions
-- cars.status to 'expertise' instead of leaving it at 'open'):
-- admin_list_expertise_ready() still filtered on c.status = 'open', so any
-- car inspected after that fix landed would never appear in the "ready for
-- auction" queue on admin.encheres.tsx. Accept both statuses, matching the
-- same 'open' OR 'expertise' guard already used in createAuctionFromCar /
-- createMultiCarEvent (src/lib/supabaseAdminApi.ts).
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
    WHERE ea.status = 'rapport_recu' AND c.status IN ('open', 'expertise');
END $function$;
