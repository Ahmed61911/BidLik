/**
 * Authenticated file upload onto the local filesystem storage volume.
 * Replaces supabase.storage.from(bucket).upload(...). See
 * src/lib/storage/providers/localFilesystemStorage.ts for the client side.
 */
import { createFileRoute } from "@tanstack/react-router";
import { canWrite } from "@/lib/storage/server/authorize.server";
import { writeStorageFile } from "@/lib/storage/server/fs.server";
import { maxBytesFor } from "@/lib/storage/server/limits.server";
import { CATEGORY_RULES } from "@/lib/storage/validation";
import { parseUserIdFromPath } from "@/lib/storage/paths";
import type { FileCategory, StorageBucket } from "@/lib/storage/types";

const BUCKETS: readonly StorageBucket[] = ["car-images", "payment-proofs", "identity", "avatars"];
const CATEGORIES: readonly FileCategory[] = [
  "commercial", "expertise", "report",
  "caution", "car-payment", "admin-refund", "admin-generic",
  "identity", "avatar",
];

// Path must look like a relative path built by src/lib/storage/paths.ts:
// segments of [A-Za-z0-9._-]+ only, no leading slash, no "..".
//
// The character class alone does NOT reject ".." (dots and dashes are both
// allowed characters, and a segment can be made of dots only) — isSafePath()
// below adds the explicit per-segment check the comment always claimed to
// enforce. resolveStoragePath() in fs.server.ts independently re-validates
// with path.resolve() containment before any disk write, so this was never
// actually exploitable end-to-end, but the regex shouldn't advertise a
// guarantee it doesn't keep on its own.
const SAFE_PATH = /^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/;
export function isSafePath(p: string): boolean {
  return SAFE_PATH.test(p) && p.split("/").every((seg) => seg !== "." && seg !== "..");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/storage/upload")({
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

          const form = await request.formData();
          const bucket = String(form.get("bucket") ?? "");
          const category = String(form.get("category") ?? "");
          const relativePath = String(form.get("path") ?? "");
          const file = form.get("file");

          if (!BUCKETS.includes(bucket as StorageBucket)) {
            return json({ ok: false, error: "Bucket invalide" }, 400);
          }
          if (!CATEGORIES.includes(category as FileCategory)) {
            return json({ ok: false, error: "Catégorie invalide" }, 400);
          }
          if (!isSafePath(relativePath)) {
            return json({ ok: false, error: "Chemin invalide" }, 400);
          }
          if (!(file instanceof File)) {
            return json({ ok: false, error: "Fichier manquant" }, 400);
          }

          const rule = CATEGORY_RULES[category as FileCategory];
          const contentType = String(form.get("contentType") ?? file.type ?? "application/octet-stream");
          if (!rule.allowedMimeTypes.includes(contentType)) {
            return json({ ok: false, error: `Type de fichier non autorisé: ${contentType}` }, 415);
          }
          const maxBytes = maxBytesFor(category as FileCategory);
          if (file.size > maxBytes) {
            return json({ ok: false, error: `Fichier trop volumineux (max ${Math.floor(maxBytes / 1024 / 1024)} Mo)` }, 413);
          }

          const allowed = await canWrite(bucket as StorageBucket, relativePath, userId);
          if (!allowed) return json({ ok: false, error: "Accès refusé" }, 403);

          const bytes = new Uint8Array(await file.arrayBuffer());
          const { size } = await writeStorageFile(bucket as StorageBucket, relativePath, bytes);

          // car_id is metadata only (never used for authorization): derived from the
          // path for car-images, or trusted from the client for payment-proofs (a
          // flat {userId}/{uuid}.ext path can't carry it) — low-risk since it only
          // affects display/filtering, not who is allowed to write.
          const carId =
            bucket === "car-images"
              ? relativePath.split("/")[1] ?? null
              : (form.get("carId") ? String(form.get("carId")) : null);
          const originalFilename = String(form.get("originalFilename") ?? file.name ?? relativePath.split("/").pop());

          // For payment-proofs/identity, the path already encodes the intended
          // owner ({userId}/{uuid}.ext) — re-derive it from there rather than
          // the uploader's own id, since an admin recording a proof "for" a
          // buyer (e.g. a refund) uploads on the buyer's behalf, not their own.
          // car-images has no such prefix (cars/{carId}/...), so it always
          // falls back to the uploader.
          const owner =
            bucket === "payment-proofs" || bucket === "identity"
              ? (parseUserIdFromPath(relativePath) ?? userId)
              : userId;

          const { error: insertErr } = await supabaseAdmin.from("storage_files").insert({
            owner,
            car_id: carId,
            bucket,
            file_category: category,
            original_filename: originalFilename,
            stored_filename: relativePath.split("/").pop() ?? relativePath,
            relative_path: relativePath,
            mime_type: contentType,
            file_size: size,
          });
          if (insertErr) {
            // Roll back the just-written file so we never leave an orphaned
            // blob with no metadata row pointing at it.
            const { removeStorageFile } = await import("@/lib/storage/server/fs.server");
            await removeStorageFile(bucket as StorageBucket, relativePath).catch(() => {});
            return json({ ok: false, error: insertErr.message }, 500);
          }

          return json({
            ok: true,
            bucket,
            path: relativePath,
            name: originalFilename,
            size,
            contentType,
          });
        } catch (e) {
          console.error("[api/storage/upload] error", e);
          return json({ ok: false, error: e instanceof Error ? e.message : "Erreur inconnue" }, 500);
        }
      },
    },
  },
});
