/**
 * Deletes one or more stored files (and their metadata rows). Replaces
 * supabase.storage.from(bucket).remove(paths).
 */
import { createFileRoute } from "@tanstack/react-router";
import { canWrite } from "@/lib/storage/server/authorize.server";
import { removeStorageFile } from "@/lib/storage/server/fs.server";
import type { StorageBucket } from "@/lib/storage/types";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/storage/remove")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
          if (!token) return json({ ok: false, error: "Non autorisé" }, 401);

          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: userRes, error: userErr } = await supabaseAdmin.auth.getUser(token);
          if (userErr || !userRes.user) return json({ ok: false, error: "Session invalide" }, 401);
          const userId = userRes.user.id;

          const body = await request.json();
          const bucket = String(body.bucket ?? "") as StorageBucket;
          const paths = Array.isArray(body.paths) ? body.paths.map(String) : [];
          if (!bucket || paths.length === 0) return json({ ok: false, error: "Requête invalide" }, 400);

          for (const relativePath of paths) {
            const allowed = await canWrite(bucket, relativePath, userId);
            if (!allowed) return json({ ok: false, error: "Accès refusé" }, 403);
          }

          for (const relativePath of paths) {
            await removeStorageFile(bucket, relativePath);
            await supabaseAdmin
              .from("storage_files")
              .delete()
              .eq("bucket", bucket)
              .eq("relative_path", relativePath);
          }

          return json({ ok: true });
        } catch (e) {
          console.error("[api/storage/remove] error", e);
          return json({ ok: false, error: e instanceof Error ? e.message : "Erreur inconnue" }, 500);
        }
      },
    },
  },
});
