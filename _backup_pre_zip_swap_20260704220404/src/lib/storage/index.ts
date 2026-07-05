/**
 * Storage service — the single entry point for all file I/O in the app.
 *
 * Every upload/download in the codebase goes through this module. To swap the
 * storage backend (Supabase → local FS / S3 / Azure), replace `provider` here.
 * To swap the image pipeline (client canvas → server sharp), replace `imageProcessor`.
 * No other file needs to change.
 */
import { ClientImageProcessor, WATERMARK_MARKER } from "./imageProcessing/clientPipeline";
import { SupabaseStorageProvider } from "./providers/supabaseStorage";
import { extFromFile } from "./paths";
import type {
  ImageProcessOptions,
  ImageProcessor,
  SignedUrlOptions,
  StorageBucket,
  StorageProvider,
  UploadOptions,
  UploadResult,
} from "./types";

export type { StorageBucket, UploadResult } from "./types";
export { carPaths, paymentPaths, extFromFile } from "./paths";

/* ─────────── Swap point ─────────── */
const provider: StorageProvider = new SupabaseStorageProvider();
const imageProcessor: ImageProcessor = new ClientImageProcessor();
/* ─────────────────────────────────── */

export interface UploadFileInput {
  file: File;
  bucket: StorageBucket;
  /** Callback that builds the target path given the final extension. */
  buildPath: (ext: string) => string;
  /** Skip image pipeline (resize/watermark). Default: false. */
  raw?: boolean;
  /** Overrides for the image pipeline. */
  imageOptions?: ImageProcessOptions;
  /** Force upsert. */
  upsert?: boolean;
}

/**
 * Upload a file through the pipeline: process (if image), then push to provider.
 * Returns { path, name, size, contentType } — store `path` in DB.
 */
async function uploadFile(input: UploadFileInput): Promise<UploadResult> {
  const shouldProcess =
    !input.raw && imageProcessor.canProcess(input.file);

  let blob: Blob = input.file;
  let contentType: string = input.file.type || "application/octet-stream";
  let ext = extFromFile(input.file);
  let displayName = input.file.name;

  if (shouldProcess) {
    const processed = await imageProcessor.process(input.file, input.imageOptions);
    blob = processed.blob;
    contentType = processed.contentType;
    ext = processed.extension;
    // Tag the display name so re-uploading the same client-side blob is idempotent.
    if (!processed.alreadyProcessed) {
      const base = input.file.name.replace(/\.[^.]+$/, "");
      displayName = `${base}.${WATERMARK_MARKER}.${ext}`;
    }
  }

  const path = input.buildPath(ext);
  return provider.upload(blob, {
    bucket: input.bucket,
    path,
    contentType,
    upsert: input.upsert,
  }).then((r) => ({ ...r, name: displayName }));
}

async function signedUrl(bucket: StorageBucket, path: string, expiresIn = 3600): Promise<string> {
  const opts: SignedUrlOptions = { bucket, path, expiresIn };
  return provider.signedUrl(opts);
}

async function remove(bucket: StorageBucket, paths: string[]): Promise<void> {
  return provider.remove(bucket, paths);
}

async function uploadRaw(file: Blob, options: UploadOptions): Promise<UploadResult> {
  return provider.upload(file, options);
}

export const storage = {
  uploadFile,
  uploadRaw,
  signedUrl,
  remove,
  /** Current provider name — useful for diagnostics. */
  get providerName() {
    return provider.name;
  },
  get processorName() {
    return imageProcessor.name;
  },
};
