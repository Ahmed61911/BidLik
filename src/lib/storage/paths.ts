/**
 * Canonical path builders for the local filesystem storage layout.
 *
 * Layout (relative to STORAGE_ROOT, one subtree per bucket):
 *   car-images/cars/{carId}/commercial/{uuid}.ext
 *   car-images/cars/{carId}/expertise/{uuid}.ext
 *   car-images/cars/{carId}/reports/{uuid}.ext
 *   payment-proofs/{userId}/{uuid}.ext
 *   identity/{userId}/{uuid}.ext
 *   avatars/{uuid}.ext
 *
 * Files belong to the Car (or the User), never to the Auction — an auction
 * only ever references an existing car's id, it never owns files itself.
 *
 * All application code must use these helpers, not string-concat paths inline.
 * The backend (src/routes/api/storage/*.ts) independently re-derives and
 * validates carId/userId from the path server-side — it never trusts a
 * client-declared owner, only the path shape itself (see
 * src/lib/storage/server/authorize.server.ts).
 */
import type { StorageBucket } from "./types";

function uuid(): string {
  // crypto.randomUUID() is available in both browsers and Bun/Node 19+.
  return crypto.randomUUID();
}

function sanitizeExt(ext: string | undefined | null): string {
  const cleaned = (ext ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return cleaned.length > 0 && cleaned.length <= 5 ? cleaned : "bin";
}

export function extFromFile(file: { name?: string; type?: string }): string {
  const fromName = file.name?.includes(".") ? file.name.split(".").pop() : undefined;
  if (fromName) return sanitizeExt(fromName);
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/png") return "png";
  if (file.type === "application/pdf") return "pdf";
  return "bin";
}

export const carPaths = {
  commercial: (carId: string, ext: string) =>
    `cars/${carId}/commercial/${uuid()}.${sanitizeExt(ext)}`,
  expertisePhoto: (carId: string, ext: string) =>
    `cars/${carId}/expertise/${uuid()}.${sanitizeExt(ext)}`,
  expertiseReport: (carId: string, ext: string) =>
    `cars/${carId}/reports/${uuid()}.${sanitizeExt(ext)}`,
};

export const paymentPaths = {
  /** Winner uploads payment proof for a car they won. */
  carPayment: (userId: string, ext: string) => `${userId}/${uuid()}.${sanitizeExt(ext)}`,
  /** Buyer uploads their caution proof. */
  userCaution: (userId: string, ext: string) => `${userId}/${uuid()}.${sanitizeExt(ext)}`,
  /** Admin records any manual payment (out-of-band settlements, refunds, etc.) for a target user. */
  adminRefund: (userId: string, ext: string) => `${userId}/${uuid()}.${sanitizeExt(ext)}`,
  adminGeneric: (userId: string, ext: string) => `${userId}/${uuid()}.${sanitizeExt(ext)}`,
};

export const identityPaths = {
  document: (userId: string, ext: string) => `${userId}/${uuid()}.${sanitizeExt(ext)}`,
};

export const avatarPaths = {
  avatar: (ext: string) => `${uuid()}.${sanitizeExt(ext)}`,
};

/**
 * Parses the carId or userId embedded in a path, mirroring the shapes above.
 * Used server-side to re-derive the authorization target — never trust a
 * client-declared owner/carId field instead of this.
 */
export function parseCarIdFromPath(path: string): string | null {
  const m = /^cars\/([^/]+)\//.exec(path);
  return m ? m[1] : null;
}

export function parseUserIdFromPath(path: string): string | null {
  const m = /^([^/]+)\//.exec(path);
  return m ? m[1] : null;
}

/**
 * Stable, unsigned URL for a public file (car-images/commercial only — see
 * PUBLIC_CATEGORIES in validation.ts). No round-trip needed unlike
 * storage.signedUrl(), since there's no per-request authorization to check;
 * /api/storage/public re-derives "is this actually a commercial path" itself
 * before serving, so this is safe to call for any car-images path.
 */
export function publicUrl(bucket: StorageBucket, path: string): string {
  return `/api/storage/public?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`;
}

