/**
 * Client for the webapp's custom file-storage REST API (NOT supabase.storage
 * — see architecture plan §1/§3). All calls target `env.API_URL`, the origin
 * of the deployed webapp server.
 */
import { supabase } from "@/services/supabase/client";
import { env } from "@/config/env";

export type StorageBucket = "car-images" | "payment-proofs" | "identity" | "avatars";

/**
 * `cars.images` holds real storage paths (e.g. "cars/154/commercial/uuid.jpg")
 * — resolve to a stable, unsigned public URL. Mirrors
 * webapp/src/lib/carImages.ts + storage/paths.ts publicUrl().
 */
export function resolveCarImageUrl(src: string): string {
  if (!/^cars\//.test(src)) return src;
  return `${env.API_URL}/api/storage/public?bucket=car-images&path=${encodeURIComponent(src)}`;
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseJsonResponse(res: Response): Promise<Record<string, unknown>> {
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || body.ok === false) {
    throw new Error(typeof body.error === "string" ? body.error : `Erreur serveur (${res.status})`);
  }
  return body;
}

/** Time-limited signed URL for private files (expertise photos, reports, payment proofs). */
export async function getSignedUrl(bucket: StorageBucket, path: string, expiresIn = 3600): Promise<string> {
  const headers = await authHeader();
  const res = await fetch(`${env.API_URL}/api/storage/signed-url`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ bucket, path, expiresIn }),
  });
  const body = await parseJsonResponse(res);
  return String(body.signedUrl);
}
