/**
 * Admin-only endpoint: delete (reject) a pending user account.
 * Caller MUST be authenticated as an admin.
 */

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const BodySchema = z.object({ userId: z.string().uuid() });

export const Route = createFileRoute("/api/public/admin-delete-user")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return json({ ok: false, error: "Non autorisé" }, 401);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
        if (userErr || !userRes.user) return json({ ok: false, error: "Session invalide" }, 401);
        const { data: roleRow } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", userRes.user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (!roleRow) return json({ ok: false, error: "Réservé aux administrateurs" }, 403);

        let raw: unknown;
        try { raw = await request.json(); }
        catch { return json({ ok: false, error: "Body invalide" }, 400); }
        const parsed = BodySchema.safeParse(raw);
        if (!parsed.success) return json({ ok: false, error: "Entrée invalide" }, 400);

        const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(parsed.data.userId);
        if (delErr) return json({ ok: false, error: delErr.message }, 500);

        return json({ ok: true }, 200);
      },
    },
  },
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
