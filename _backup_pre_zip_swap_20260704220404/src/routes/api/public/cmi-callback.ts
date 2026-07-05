/**
 * CMI server-to-server callback. CMI POSTs form-urlencoded data with HASH/HASHPARAMS.
 * We verify the hash, then update payments + profile.caution_validee accordingly.
 */
import { createFileRoute } from "@tanstack/react-router";
import { verifyCmiCallback } from "@/lib/cmi";

export const Route = createFileRoute("/api/public/cmi-callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const storeKey = process.env.CMI_STORE_KEY;
        if (!storeKey) return new Response("Misconfigured", { status: 500 });

        // CMI sends application/x-www-form-urlencoded
        let body: Record<string, string> = {};
        const ctype = request.headers.get("content-type") || "";
        if (ctype.includes("application/x-www-form-urlencoded") || ctype.includes("multipart/form-data")) {
          const fd = await request.formData();
          fd.forEach((v, k) => {
            body[k] = typeof v === "string" ? v : "";
          });
        } else {
          // fallback (some CMI envs post as text)
          const text = await request.text();
          for (const part of text.split("&")) {
            const [k, v = ""] = part.split("=");
            if (k) body[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, " "));
          }
        }

        const valid = verifyCmiCallback(body, storeKey);
        if (!valid) {
          console.error("CMI callback: invalid hash", { oid: body.oid });
          return new Response("FAILURE", { status: 400 });
        }

        const oid = body.oid;
        const procReturnCode = body.ProcReturnCode || body.procreturncode;
        const response = (body.Response || body.response || "").toLowerCase();
        const success = procReturnCode === "00" && (response === "approved" || response === "success");

        if (!oid) return new Response("FAILURE", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: payment } = await supabaseAdmin
          .from("payments")
          .select("id, user_id, type, status, amount")
          .eq("reference", oid)
          .maybeSingle();

        if (!payment) {
          console.error("CMI callback: unknown oid", oid);
          return new Response("FAILURE", { status: 404 });
        }

        // Idempotent: if already terminal, don't re-process.
        if (payment.status === "paye" || payment.status === "annule") {
          return new Response(payment.status === "paye" ? "APPROVED" : "FAILURE", {
            status: 200,
            headers: { "Content-Type": "text/plain" },
          });
        }

        // Verify CMI-reported amount matches the payment record.
        const reportedAmount = Number(body.amount ?? body.Amount ?? "0");
        if (success && reportedAmount && Math.round(reportedAmount) !== payment.amount) {
          console.error("CMI callback: amount mismatch", {
            oid,
            reported: reportedAmount,
            expected: payment.amount,
          });
          await supabaseAdmin
            .from("payments")
            .update({ status: "annule", notes: "Montant CMI incohérent" })
            .eq("id", payment.id);
          return new Response("FAILURE", { status: 400 });
        }

        if (success) {
          await supabaseAdmin
            .from("payments")
            .update({ status: "paye", paid_at: new Date().toISOString() })
            .eq("id", payment.id);

          if (payment.type === "caution") {
            await supabaseAdmin
              .from("profiles")
              .update({ caution_validee: true })
              .eq("user_id", payment.user_id);
          }
        } else {
          await supabaseAdmin
            .from("payments")
            .update({ status: "annule" })
            .eq("id", payment.id);
        }


        // CMI expects "ACTION=POSTAUTH" or simply 200 OK with "APPROVED"/"FAILURE"
        return new Response(success ? "APPROVED" : "FAILURE", {
          status: 200,
          headers: { "Content-Type": "text/plain" },
        });
      },
    },
  },
});
