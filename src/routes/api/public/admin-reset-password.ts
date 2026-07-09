/**
 * Admin-only endpoint: reset or set another user's password.
 * Caller MUST be authenticated as an admin (verified via Bearer token).
 */

import { createFileRoute } from "@tanstack/react-router";
import { randomBytes } from "crypto";
import { z } from "zod";

const BodySchema = z.object({
  userId: z.string().uuid("Utilisateur invalide"),
  newPassword: z.string().min(8, "8 caractères minimum").max(128).optional(),
});

export const Route = createFileRoute("/api/public/admin-reset-password")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return json({ ok: false, error: "Non autorisé" }, 401);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 1. Verify caller is admin
        const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
        if (userErr || !userRes.user) return json({ ok: false, error: "Session invalide" }, 401);
        const { data: roleRow } = await supabaseAdmin
          .from("user_roles")
          .select("role")
          .eq("user_id", userRes.user.id)
          .eq("role", "admin")
          .maybeSingle();
        if (!roleRow) return json({ ok: false, error: "Réservé aux administrateurs" }, 403);

        // 2. Parse + validate body with Zod
        let raw: unknown;
        try { raw = await request.json(); }
        catch { return json({ ok: false, error: "Body invalide" }, 400); }
        const parsed = BodySchema.safeParse(raw);
        if (!parsed.success) {
          return json({ ok: false, error: parsed.error.issues[0]?.message ?? "Entrée invalide" }, 400);
        }
        const { userId, newPassword: providedPwd } = parsed.data;

        // 3. Set the password — generate one if the admin didn't type their own.
        const wasGenerated = !providedPwd;
        const newPassword = providedPwd ?? randomBytes(12).toString("base64url") + "A1!";
        const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: newPassword,
        });
        if (updateErr) return json({ ok: false, error: updateErr.message }, 500);

        return json({ ok: true, newPassword: wasGenerated ? newPassword : undefined }, 200);
      },
    },
  },
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
