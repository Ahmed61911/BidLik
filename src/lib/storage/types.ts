/**
 * Storage abstraction — provider-agnostic interfaces.
 *
 * Application code never talks to Supabase/S3/filesystem directly. It calls
 * `storage.upload(...)`, `storage.signedUrl(...)`, `storage.remove(...)`, and
 * the provider under the hood decides where bytes physically go.
 *
 * To migrate off Supabase (e.g. Dockerized VPS + local FS, or S3), only add a
 * new class implementing `StorageProvider` and swap the singleton in
 * `src/lib/storage/index.ts`. No call-site changes required.
 */

/** Logical storage buckets. Providers map these to physical containers. */
export type StorageBucket = "car-images" | "payment-proofs" | "identity" | "avatars";

/**
 * File category within a bucket — drives validation (mime/size) and
 * authorization on the backend. For "car-images" the category is derivable
 * from the path alone (cars/{carId}/commercial|expertise|reports/...); for
 * "payment-proofs" it must be declared explicitly since the path is flat
 * ({userId}/{uuid}.ext) and doesn't distinguish caution vs car-payment vs
 * admin-recorded settlements. It only affects stored metadata, never the
 * write-authorization decision (see src/lib/storage/server/authorize.server.ts).
 */
export type FileCategory =
  | "commercial"
  | "expertise"
  | "report"
  | "caution"
  | "car-payment"
  | "admin-refund"
  | "admin-generic"
  | "identity"
  | "avatar";

/** Access scope for signed/download URLs. */
export type UrlAccess = "private" | "public-read";

export interface UploadOptions {
  /** Logical bucket. */
  bucket: StorageBucket;
  /** Relative path within the bucket, e.g. `cars/{carId}/commercial/x.jpg`. */
  path: string;
  /**
   * What kind of file this is. Required so the backend can validate/store
   * metadata even when the category isn't derivable from the path alone
   * (e.g. "payment-proofs" paths are flat `{userId}/{uuid}.ext`).
   */
  category: FileCategory;
  /**
   * Optional car linkage for the metadata row (e.g. which car a payment
   * proof was for). Trusted as metadata only — never used for authorization,
   * which is always re-derived from the path itself.
   */
  carId?: string;
  /** MIME type; auto-detected from file when omitted. */
  contentType?: string;
  /** Cache-Control seconds. Default: 3600. */
  cacheControl?: number;
  /** If true, overwrite an existing object at the same path. Default: false. */
  upsert?: boolean;
}

export interface UploadResult {
  bucket: StorageBucket;
  /** Relative path stored in DB. Never an absolute URL. */
  path: string;
  /** Original file name (for display). */
  name: string;
  /** Byte size after processing. */
  size: number;
  /** Final MIME type. */
  contentType: string;
}

export interface SignedUrlOptions {
  bucket: StorageBucket;
  path: string;
  /** Seconds until expiry. Default: 3600. */
  expiresIn?: number;
}

/**
 * StorageProvider — the swap point.
 * Implementations: SupabaseStorageProvider (current), LocalStorageProvider (future),
 * S3StorageProvider (future), AzureStorageProvider (future).
 */
export interface StorageProvider {
  readonly name: string;
  upload(file: Blob | File, options: UploadOptions): Promise<UploadResult>;
  signedUrl(options: SignedUrlOptions): Promise<string>;
  remove(bucket: StorageBucket, paths: string[]): Promise<void>;
}

/* ─────────── Image processing abstraction ─────────── */

export interface ImageProcessOptions {
  /** Max longest side in px. Default: 1920. */
  maxDimension?: number;
  /** JPEG/WebP quality 0..1. Default: 0.85. */
  quality?: number;
  /** Apply Bidlik watermark. Default: true. */
  watermark?: boolean;
  /** Output MIME. Default: "image/jpeg". */
  outputType?: "image/jpeg" | "image/webp";
}

export interface ProcessedImage {
  blob: Blob;
  /** Final MIME type. */
  contentType: string;
  /** Suggested extension without dot, e.g. "jpg". */
  extension: string;
  width: number;
  height: number;
  /** True if the pipeline already ran on this input (watermark marker present). */
  alreadyProcessed: boolean;
}

/**
 * ImageProcessor — swap point for pipelines.
 * Implementations: ClientImageProcessor (canvas, current),
 * NoopImageProcessor (passthrough), ServerImageProcessor (future).
 */
export interface ImageProcessor {
  readonly name: string;
  /** Returns true if this processor can handle the file (i.e. it's an image). */
  canProcess(file: File | Blob): boolean;
  process(file: File | Blob, options?: ImageProcessOptions): Promise<ProcessedImage>;
}
