/**
 * Local filesystem access for storage — server-only (never bundled to the
 * client). All physical paths are derived from STORAGE_ROOT + a bucket +
 * a relative path that has already been validated by authorize.server.ts.
 *
 * Security: every path is normalized and re-checked to still be inside
 * STORAGE_ROOT/{bucket} before touching disk. This is defense-in-depth on
 * top of the regex validation in paths.ts/authorize.server.ts — belt and
 * suspenders against directory traversal / path injection.
 */
import { mkdir, open, stat, unlink as fsUnlink } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import type { StorageBucket } from "../types";

function storageRoot(): string {
  const root = process.env.STORAGE_ROOT;
  if (!root) throw new Error("STORAGE_ROOT environment variable is not set");
  return path.resolve(root);
}

/**
 * Resolves `bucket/relativePath` to an absolute filesystem path, rejecting
 * anything that would escape the bucket's directory (traversal, absolute
 * paths, null bytes, etc.). `relativePath` must already match the shapes
 * produced by src/lib/storage/paths.ts — this is the last line of defense,
 * not the primary validation.
 */
export function resolveStoragePath(bucket: StorageBucket, relativePath: string): string {
  if (relativePath.includes("\0")) throw new Error("Invalid path");
  if (path.isAbsolute(relativePath)) throw new Error("Invalid path");

  const bucketRoot = path.resolve(storageRoot(), bucket);
  const resolved = path.resolve(bucketRoot, relativePath);

  const withSep = bucketRoot.endsWith(path.sep) ? bucketRoot : bucketRoot + path.sep;
  if (resolved !== bucketRoot && !resolved.startsWith(withSep)) {
    throw new Error("Path escapes storage bucket");
  }
  return resolved;
}

export async function ensureParentDir(absoluteFilePath: string): Promise<void> {
  await mkdir(path.dirname(absoluteFilePath), { recursive: true });
}

export async function writeStorageFile(
  bucket: StorageBucket,
  relativePath: string,
  data: Uint8Array,
): Promise<{ absolutePath: string; size: number }> {
  const absolutePath = resolveStoragePath(bucket, relativePath);
  await ensureParentDir(absolutePath);
  const handle = await open(absolutePath, "wx"); // fail if it already exists — uuid names never collide
  try {
    await handle.writeFile(data);
  } finally {
    await handle.close();
  }
  const info = await stat(absolutePath);
  return { absolutePath, size: info.size };
}

export function readStorageFileStream(bucket: StorageBucket, relativePath: string) {
  const absolutePath = resolveStoragePath(bucket, relativePath);
  return createReadStream(absolutePath);
}

export async function statStorageFile(bucket: StorageBucket, relativePath: string) {
  const absolutePath = resolveStoragePath(bucket, relativePath);
  return stat(absolutePath);
}

export async function removeStorageFile(bucket: StorageBucket, relativePath: string): Promise<void> {
  const absolutePath = resolveStoragePath(bucket, relativePath);
  await fsUnlink(absolutePath).catch((err) => {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  });
}
