/**
 * Upload validation rules per file category — shared by the client (for fast
 * feedback before an upload even starts) and the backend (authoritative;
 * never trust the client-side check alone). Keep in sync with the spec:
 * commercial/expertise/reports/payment-proofs/identity all accept the same
 * image set plus PDF for documents; avatars are images only.
 */
import type { FileCategory } from "./types";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const DOCUMENT_TYPES = [...IMAGE_TYPES, "application/pdf"] as const;

export interface CategoryRule {
  allowedMimeTypes: readonly string[];
  /** Default max size in bytes; overridable via env on the server. */
  maxBytes: number;
}

const TEN_MB = 10 * 1024 * 1024;
const EIGHT_MB = 8 * 1024 * 1024;

export const CATEGORY_RULES: Record<FileCategory, CategoryRule> = {
  commercial: { allowedMimeTypes: IMAGE_TYPES, maxBytes: TEN_MB },
  expertise: { allowedMimeTypes: IMAGE_TYPES, maxBytes: TEN_MB },
  report: { allowedMimeTypes: DOCUMENT_TYPES, maxBytes: EIGHT_MB },
  caution: { allowedMimeTypes: DOCUMENT_TYPES, maxBytes: EIGHT_MB },
  "car-payment": { allowedMimeTypes: DOCUMENT_TYPES, maxBytes: EIGHT_MB },
  "admin-refund": { allowedMimeTypes: DOCUMENT_TYPES, maxBytes: EIGHT_MB },
  "admin-generic": { allowedMimeTypes: DOCUMENT_TYPES, maxBytes: EIGHT_MB },
  identity: { allowedMimeTypes: DOCUMENT_TYPES, maxBytes: EIGHT_MB },
  avatar: { allowedMimeTypes: IMAGE_TYPES, maxBytes: TEN_MB },
};

/** Buckets that serve reads with no authorization check. Everything else is private. */
export const PUBLIC_CATEGORIES: ReadonlySet<FileCategory> = new Set(["commercial"]);
