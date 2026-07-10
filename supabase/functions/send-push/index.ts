// Sends push notifications via Expo's push service for a single in-app
// notification event. Invoked by the pg_net webhook trigger defined in
// supabase/migrations/20260709122000_push_webhook_trigger.sql — see
// mobile app architecture plan §7 for the end-to-end flow.
//
// Payload intentionally carries only type + ids, never bid/payment amounts —
// the app fetches full details over an authenticated request after the user
// taps the notification (see genericBodyFor below).
import { createClient } from "npm:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface PushRequestBody {
  notification_id: string;
  user_id: string;
  type: string;
  titre: string;
  auction_id?: string | null;
}

interface ExpoTicket {
  status: "ok" | "error";
  details?: { error?: string };
}

function genericBodyFor(type: string): string {
  switch (type) {
    case "outbid":
      return "Vous avez été surenchéri. Appuyez pour voir l'enchère.";
    case "won":
      return "Vous avez remporté une enchère !";
    case "lost":
      return "Une enchère à laquelle vous avez participé est terminée.";
    case "ending_soon":
      return "Une enchère se termine bientôt.";
    case "auction_starting":
      return "Une nouvelle enchère vient de démarrer.";
    case "caution":
      return "Mise à jour de votre caution.";
    case "payment_approved":
      return "Votre paiement a été approuvé.";
    case "payment_rejected":
      return "Votre paiement a été rejeté.";
    case "vehicle_ready":
      return "Votre véhicule est prêt.";
    case "announcement":
      return "Nouvelle annonce Bidlik.";
    default:
      return "Appuyez pour voir les détails.";
  }
}

export async function handleSendPush(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let payload: PushRequestBody;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "Invalid JSON body" }), { status: 400 });
  }
  if (!payload.user_id || !payload.type) {
    return new Response(JSON.stringify({ ok: false, error: "Missing user_id/type" }), { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ ok: false, error: "Function misconfigured: missing Supabase env vars" }), {
      status: 500,
    });
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: tokens, error } = await supabase
    .from("device_push_tokens")
    .select("expo_push_token")
    .eq("user_id", payload.user_id);

  if (error) {
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
  }
  if (!tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const messages = tokens.map((t: { expo_push_token: string }) => ({
    to: t.expo_push_token,
    title: payload.titre || "Bidlik",
    body: genericBodyFor(payload.type),
    data: {
      type: payload.type,
      notification_id: payload.notification_id,
      auction_id: payload.auction_id ?? null,
    },
    sound: "default",
  }));

  const expoResponse = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(messages),
  });
  const expoResult: { data?: ExpoTicket[] } | null = await expoResponse.json().catch(() => null);

  // Clean up tokens Expo reports as permanently dead so we stop paying the
  // lookup/send cost for them on every future notification.
  const deadTokens: string[] = [];
  expoResult?.data?.forEach((ticket, i) => {
    if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
      deadTokens.push(messages[i].to);
    }
  });
  if (deadTokens.length > 0) {
    await supabase.from("device_push_tokens").delete().in("expo_push_token", deadTokens);
  }

  return new Response(JSON.stringify({ ok: true, sent: messages.length, dead: deadTokens.length }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
