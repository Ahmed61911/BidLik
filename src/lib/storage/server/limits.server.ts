/**
 * Server-only max-size overrides. Kept separate from validation.ts (which is
 * imported by client code too) since `process.env.STORAGE_MAX_*` must never
 * be evaluated in a browser bundle.
 */
import { CATEGORY_RULES } from "../validation";
import type { FileCategory } from "../types";

const ENV_KEYS: Partial<Record<FileCategory, string>> = {
  commercial: "STORAGE_MAX_IMAGE_BYTES",
  expertise: "STORAGE_MAX_IMAGE_BYTES",
  avatar: "STORAGE_MAX_IMAGE_BYTES",
  report: "STORAGE_MAX_DOCUMENT_BYTES",
  caution: "STORAGE_MAX_DOCUMENT_BYTES",
  "car-payment": "STORAGE_MAX_DOCUMENT_BYTES",
  "admin-refund": "STORAGE_MAX_DOCUMENT_BYTES",
  "admin-generic": "STORAGE_MAX_DOCUMENT_BYTES",
  identity: "STORAGE_MAX_DOCUMENT_BYTES",
};

export function maxBytesFor(category: FileCategory): number {
  const envKey = ENV_KEYS[category];
  const fromEnv = envKey ? Number(process.env[envKey]) : NaN;
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : CATEGORY_RULES[category].maxBytes;
}
