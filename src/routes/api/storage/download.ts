/**
 * Streams a file from the local filesystem storage volume. Never reachable
 * without a valid signed token (see /api/storage/signed-url) — authorization
 * is checked once, up front, when that token is minted; this endpoint only
 * verifies the token + expiry, exactly mirroring Supabase's own signed URLs.
 * The real filesystem path is never exposed to the client — only the opaque
 * token is, and it is verified before any disk access happens.
 */
import { createFileRoute } from "@tanstack/react-router";
import { verifyDownloadToken } from "@/lib/storage/server/signing.server";
import { resolveStoragePath } from "@/lib/storage/server/fs.server";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { StorageBucket } from "@/lib/storage/types";

export const Route = createFileRoute("/api/storage/download")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token");
        if (!token) return new Response("Missing token", { status: 400 });

        const payload = verifyDownloadToken(token);
        if (!payload) return new Response("Invalid or expired link", { status: 403 });

        let absolutePath: string;
        try {
          absolutePath = resolveStoragePath(payload.bucket as StorageBucket, payload.path);
        } catch {
          return new Response("Invalid path", { status: 400 });
        }

        let size: number;
        try {
          size = (await stat(absolutePath)).size;
        } catch {
          return new Response("Not found", { status: 404 });
        }

        const isInline = payload.mimeType.startsWith("image/");
        const disposition = isInline
          ? "inline"
          : `attachment; filename="${encodeURIComponent(payload.filename)}"`;

        const nodeStream = createReadStream(absolutePath);
        const webStream = new ReadableStream({
          start(controller) {
            nodeStream.on("data", (chunk) => controller.enqueue(new Uint8Array(chunk as Buffer)));
            nodeStream.on("end", () => controller.close());
            nodeStream.on("error", (err) => controller.error(err));
          },
          cancel() {
            nodeStream.destroy();
          },
        });

        return new Response(webStream, {
          status: 200,
          headers: {
            "Content-Type": payload.mimeType,
            "Content-Length": String(size),
            "Content-Disposition": disposition,
            "Cache-Control": isInline ? "private, max-age=3600" : "private, no-store",
          },
        });
      },
    },
  },
});
