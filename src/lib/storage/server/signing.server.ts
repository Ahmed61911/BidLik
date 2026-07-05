/**
 * Signed download tokens — server-only.
 *
 * The browser needs plain `<img src>` / `<a href>` URLs for private files
 * (no way to attach an Authorization header there), so authorization is
 * checked once, up front, when the signed URL is minted (see
 * src/routes/api/storage/signed-url.ts) — the resulting token is the proof
 * that check already happened. /api/storage/download then only verifies the
 * token + expiry, exactly mirroring what Supabase's own createSignedUrl does.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

function secret(): string {
  const s = process.env.STORAGE_SIGNING_SECRET;
  if (!s) throw new Error("STORAGE_SIGNING_SECRET environment variable is not set");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export interface DownloadTokenPayload {
  bucket: string;
  path: string;
  mimeType: string;
  filename: string;
  exp: number; // unix seconds
}

export function issueDownloadToken(payload: DownloadTokenPayload): string {
  const dataB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = sign(dataB64);
  return `${dataB64}.${sig}`;
}

export function verifyDownloadToken(token: string): DownloadTokenPayload | null {
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const dataB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(dataB64);

  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload: DownloadTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(dataB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof payload?.bucket !== "string" || typeof payload?.path !== "string") return null;
  if (!Number.isFinite(payload.exp) || Date.now() / 1000 > payload.exp) return null;

  return payload;
}
