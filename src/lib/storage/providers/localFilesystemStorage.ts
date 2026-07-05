/**
 * LocalFilesystemStorageProvider — uploads/downloads/deletes files through
 * this app's own /api/storage/* routes onto a local filesystem volume
 * (see docker-compose.yml's "storage-files" volume mounted at STORAGE_ROOT).
 *
 * Swapped in for SupabaseStorageProvider in ../index.ts. No call-site changes
 * required — same StorageProvider interface.
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  SignedUrlOptions,
  StorageBucket,
  StorageProvider,
  UploadOptions,
  UploadResult,
} from "../types";

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

export class LocalFilesystemStorageProvider implements StorageProvider {
  readonly name = "local-filesystem";

  async upload(file: Blob | File, options: UploadOptions): Promise<UploadResult> {
    const headers = await authHeader();
    const contentType = options.contentType ?? (file as File).type ?? "application/octet-stream";
    const originalFilename = (file as File).name ?? options.path.split("/").pop() ?? options.path;

    const form = new FormData();
    form.set("bucket", options.bucket);
    form.set("category", options.category);
    form.set("path", options.path);
    form.set("contentType", contentType);
    form.set("originalFilename", originalFilename);
    if (options.carId) form.set("carId", options.carId);
    form.set("file", file, originalFilename);

    const res = await fetch("/api/storage/upload", { method: "POST", headers, body: form });
    const body = await parseJsonResponse(res);

    return {
      bucket: options.bucket,
      path: String(body.path),
      name: String(body.name),
      size: Number(body.size),
      contentType: String(body.contentType),
    };
  }

  async signedUrl(options: SignedUrlOptions): Promise<string> {
    const headers = await authHeader();
    const res = await fetch("/api/storage/signed-url", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        bucket: options.bucket,
        path: options.path,
        expiresIn: options.expiresIn ?? 3600,
      }),
    });
    const body = await parseJsonResponse(res);
    return String(body.signedUrl);
  }

  async remove(bucket: StorageBucket, paths: string[]): Promise<void> {
    if (paths.length === 0) return;
    const headers = await authHeader();
    const res = await fetch("/api/storage/remove", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ bucket, paths }),
    });
    await parseJsonResponse(res);
  }
}
