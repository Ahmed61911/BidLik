/**
 * Canonical path builders for the organized storage layout.
 *
 * Layout:
 *   car-images/cars/{carId}/commercial/*
 *   car-images/cars/{carId}/expertise/photos/*
 *   car-images/cars/{carId}/expertise/report/*
 *   payment-proofs/cars/{carId}/payments/*
 *   payment-proofs/users/{userId}/caution/*
 *   payment-proofs/admin/refunds/*
 *
 * All application code must use these helpers, not string-concat paths inline.
 */

function rand(): string {
  return Math.random().toString(36).slice(2, 8);
}

function stamp(): string {
  return `${Date.now()}-${rand()}`;
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
    `cars/${carId}/commercial/${stamp()}.${sanitizeExt(ext)}`,
  expertisePhoto: (carId: string, ext: string) =>
    `cars/${carId}/expertise/photos/${stamp()}.${sanitizeExt(ext)}`,
  expertiseReport: (carId: string, ext: string) =>
    `cars/${carId}/expertise/report/${stamp()}.${sanitizeExt(ext)}`,
};

export const paymentPaths = {
  /** Winner uploads payment proof for a car they won. */
  carPayment: (carId: string, userId: string, ext: string) =>
    `cars/${carId}/payments/${userId}-${stamp()}.${sanitizeExt(ext)}`,
  /** Buyer uploads their caution proof. */
  userCaution: (userId: string, ext: string) =>
    `users/${userId}/caution/${stamp()}.${sanitizeExt(ext)}`,
  /** Admin records any manual payment (out-of-band settlements, refunds, etc.). */
  adminRefund: (ext: string) =>
    `admin/refunds/${stamp()}.${sanitizeExt(ext)}`,
  adminGeneric: (ext: string) =>
    `admin/generic/${stamp()}.${sanitizeExt(ext)}`,
};
