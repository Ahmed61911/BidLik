-- ============================================================================
-- Mobile push notification infrastructure (part 3/3) — fires the send-push
-- Edge Function (supabase/functions/send-push) via pg_net whenever a
-- notification row is inserted, for ANY notification (existing types like
-- outbid/won/lost/caution/system, and the new ones from the previous
-- migration alike). This is the single place in-app and push notifications
-- fan out from — see architecture plan §7.
--
-- Calls the `functions` container directly over the docker-compose internal
-- network (bypassing the public Kong /functions/v1 route entirely), matching
-- the existing trust boundary already established for that container
-- (VERIFY_JWT=false in docker/docker-compose.yml). If you deploy the
-- functions service somewhere no longer reachable at this internal hostname,
-- or expose it publicly, update the URL below and add authentication.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_push_on_notification_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN
    PERFORM net.http_post(
      url := 'http://functions:9000/send-push',
      body := jsonb_build_object(
        'notification_id', NEW.id,
        'user_id', NEW.user_id,
        'type', NEW.type,
        'titre', NEW.titre,
        'auction_id', NEW.auction_id
      ),
      headers := jsonb_build_object('Content-Type', 'application/json'),
      timeout_milliseconds := 5000
    );
  EXCEPTION WHEN OTHERS THEN
    -- A push-delivery hiccup (functions container down, pg_net misfire, ...)
    -- must never roll back the business transaction that inserted this
    -- notification row (a bid, a payment status change, ...).
    RAISE WARNING 'notify_push_on_notification_insert: %', SQLERRM;
  END;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_notify_push_on_notification_insert AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.notify_push_on_notification_insert();
