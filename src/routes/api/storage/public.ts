/**
 * Serves public files (car-images/commercial only) with no auth/signing —
 * there's nothing to authorize, so a stable, cacheable URL is the right fit
 * (unlike /api/storage/download, which requires a signed token). Still
 * re-derives "is this actually a public path" itself rather than trusting
 * the caller, and still never exposes the real filesystem location.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { resolveStoragePath } from "@/lib/storage/server/fs.server";
import { parseCarIdFromPath } from "@/lib/storage/paths";
import type { StorageBucket } from "@/lib/storage/types";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export const Route = createFileRoute("/api/storage/public")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const bucket = url.searchParams.get("bucket") as StorageBucket | null;
        const path = url.searchParams.get("path");
        if (!bucket || !path) return new Response("Missing parameters", { status: 400 });

        // Only car-images/commercial is public — everything else must go
        // through the signed /api/storage/download flow.
        const isCommercial = bucket === "car-images" && /^cars\/[^/]+\/commercial\//.test(path);
        if (!isCommercial || !parseCarIdFromPath(path)) {
          return new Response("Not found", { status: 404 });
        }

        let absolutePath: string;
        try {
          absolutePath = resolveStoragePath(bucket, path);
        } catch {
          return new Response("Invalid path", { status: 400 });
        }

        let size: number;
        try {
          size = (await stat(absolutePath)).size;
        } catch {
          return new Response("Not found", { status: 404 });
        }

        const ext = path.split(".").pop()?.toLowerCase() ?? "";
        const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";

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
            "Content-Type": contentType,
            "Content-Length": String(size),
            // UUID filenames are never reused/overwritten — safe to cache forever.
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      },
    },
  },
});
