/**
 * Mints a short-lived signed download URL for a stored file, after checking
 * the caller is authorized to read it. Replaces
 * supabase.storage.from(bucket).createSignedUrl(path, expiresIn).
 */
import { createFileRoute } from "@tanstack/react-router";
import { canRead } from "@/lib/storage/server/authorize.server";
import { issueDownloadToken } from "@/lib/storage/server/signing.server";
import type { StorageBucket } from "@/lib/storage/types";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/storage/signed-url")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          // Auth is optional here — public categories (commercial car photos)
          // can be signed for anonymous visitors too. canRead() enforces the
          // real gate per category.
          const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
          let userId: string | null = null;
          if (token) {
            const { data: userRes } = await supabaseAdmin.auth.getUser(token);
            userId = userRes.user?.id ?? null;
          }

          const body = await request.json();
          const bucket = String(body.bucket ?? "") as StorageBucket;
          const relativePath = String(body.path ?? "");
          const expiresIn = Math.min(Math.max(Number(body.expiresIn) || 3600, 60), 7 * 24 * 3600);
          if (!bucket || !relativePath) return json({ ok: false, error: "Requête invalide" }, 400);

          const { data: row, error: rowErr } = await supabaseAdmin
            .from("storage_files")
            .select("owner, car_id, file_category, mime_type, original_filename")
            .eq("bucket", bucket)
            .eq("relative_path", relativePath)
            .maybeSingle();
          if (rowErr) return json({ ok: false, error: rowErr.message }, 500);
          if (!row) return json({ ok: false, error: "Fichier introuvable" }, 404);

          const allowed = await canRead(
            row.file_category as never,
            row.owner as string | null,
            row.car_id as string | null,
            userId,
          );
          if (!allowed) return json({ ok: false, error: "Accès refusé" }, 403);

          const exp = Math.floor(Date.now() / 1000) + expiresIn;
          const dlToken = issueDownloadToken({
            bucket,
            path: relativePath,
            mimeType: row.mime_type as string,
            filename: row.original_filename as string,
            exp,
          });

          // Relative URL — this is always fetched by the same browser that
          // already loaded the page from the right origin, so there's no
          // need for (and no risk from) an absolute APP_ORIGIN mismatch.
          const url = `/api/storage/download?token=${encodeURIComponent(dlToken)}`;
          return json({ ok: true, signedUrl: url });
        } catch (e) {
          console.error("[api/storage/signed-url] error", e);
          return json({ ok: false, error: e instanceof Error ? e.message : "Erreur inconnue" }, 500);
        }
      },
    },
  },
});
