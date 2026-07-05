/**
 * Initialise a CMI payment for the authenticated buyer.
 * Returns the gateway URL + signed form fields. Client auto-submits.
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { computeCmiHash } from "@/lib/cmi";

// Same-origin only — no CORS. Cross-origin sites must not be able to
// trigger a CMI payment on behalf of a signed-in user (CSRF-adjacent).

const BodySchema = z.object({
  type: z.enum(["caution"]).default("caution"),
  amount: z.number().int().min(100).max(1_000_000),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}


export const Route = createFileRoute("/api/public/cmi-init")({
  server: {
    handlers: {

      POST: async ({ request }) => {
        try {
          const clientId = process.env.CMI_CLIENT_ID;
          const storeKey = process.env.CMI_STORE_KEY;
          const gatewayUrl = process.env.CMI_GATEWAY_URL;
          if (!clientId || !storeKey || !gatewayUrl) {
            return json(
              { ok: false, error: "Paiement CMI non configuré. Contactez l'administrateur." },
              200,
            );
          }

          const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
          if (!token) return json({ ok: false, error: "Non autorisé" }, 200);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
          if (userErr || !userRes.user) return json({ ok: false, error: "Session invalide" }, 200);

          const body = BodySchema.parse(await request.json());
          const user = userRes.user;

          const { data: profile } = await supabaseAdmin
            .from("profiles")
            .select("nom, email, telephone, ville")
            .eq("user_id", user.id)
            .maybeSingle();

          // Create pending payment row
          const oid = `CAU-${user.id.slice(0, 8)}-${Date.now()}`;
          const { error: insErr } = await supabaseAdmin.from("payments").insert({
            user_id: user.id,
            type: body.type,
            amount: body.amount,
            status: "en_attente",
            reference: oid,
          });
          if (insErr) return json({ ok: false, error: insErr.message }, 200);

          // Trusted server-side origin only — never derive from request headers,
          // otherwise a caller could redirect CMI callbacks to an attacker host.
          const origin =
            process.env.APP_ORIGIN ||
            (() => {
              const u = new URL(request.url);
              return `${u.protocol}//${u.host}`;
            })();

          const fields: Record<string, string> = {
            clientid: clientId,
            storetype: "3D_PAY_HOSTING",
            hashAlgorithm: "ver3",
            TranType: "PreAuth",
            amount: body.amount.toFixed(2),
            currency: "504", // MAD
            oid,
            okUrl: `${origin}/acheteur/caution?cmi=ok`,
            failUrl: `${origin}/acheteur/caution?cmi=fail`,
            callbackUrl: `${origin}/api/public/cmi-callback`,
            shopurl: origin,
            lang: "fr",
            rnd: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            encoding: "utf-8",
            refreshtime: "5",
            email: profile?.email || user.email || "",
            BillToName: profile?.nom || "Acheteur",
            BillToCity: profile?.ville || "",
            BillToCountry: "504",
            tel: profile?.telephone || "",
          };

          fields.hash = computeCmiHash(fields, storeKey);

          return json({ ok: true, action: gatewayUrl, fields });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Erreur inconnue";
          console.error("[cmi-init] error", e);
          return json({ ok: false, error: msg }, 200);
        }
      },
    },
  },
});
