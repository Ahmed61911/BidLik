/**
 * SupabaseStorageProvider — current implementation.
 * Maps logical buckets to Supabase Storage buckets 1:1.
 *
 * Replace with LocalStorageProvider/S3StorageProvider by implementing the
 * StorageProvider interface and swapping the singleton in ../index.ts.
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  SignedUrlOptions,
  StorageBucket,
  StorageProvider,
  UploadOptions,
  UploadResult,
} from "../types";

export class SupabaseStorageProvider implements StorageProvider {
  readonly name = "supabase";

  async upload(file: Blob | File, options: UploadOptions): Promise<UploadResult> {
    const contentType = options.contentType ?? (file as File).type ?? "application/octet-stream";
    const { error } = await supabase.storage.from(options.bucket).upload(options.path, file, {
      cacheControl: String(options.cacheControl ?? 3600),
      upsert: options.upsert ?? false,
      contentType,
    });
    if (error) throw new Error(error.message);
    return {
      bucket: options.bucket,
      path: options.path,
      name: (file as File).name ?? options.path.split("/").pop() ?? options.path,
      size: file.size,
      contentType,
    };
  }

  async signedUrl(options: SignedUrlOptions): Promise<string> {
    const { data, error } = await supabase.storage
      .from(options.bucket)
      .createSignedUrl(options.path, options.expiresIn ?? 3600);
    if (error) throw new Error(error.message);
    return data.signedUrl;
  }

  async remove(bucket: StorageBucket, paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) throw new Error(error.message);
  }
}
