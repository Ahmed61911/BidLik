/**
 * ClientImageProcessor — canvas-based pipeline that runs in the browser.
 *
 * Responsibilities:
 *  - Downscale images longer than `maxDimension` while preserving aspect ratio.
 *  - Re-encode as JPEG (or WebP) with configurable quality → strips EXIF as a
 *    side effect of canvas re-encoding.
 *  - Apply the Bidlik watermark bottom-right, ~12% width, ~55% opacity.
 *  - Idempotent: files whose name contains `WATERMARK_MARKER` are returned as-is.
 *
 * To move this off the browser (server-side sharp, imgproxy, Cloudflare Images,
 * etc.), implement ImageProcessor in a new class and swap it in ../index.ts.
 * Upload call sites stay unchanged.
 */
import bidlikMark from "@/assets/bidlik-mark.png";
import type { ImageProcessOptions, ImageProcessor, ProcessedImage } from "../types";

export const WATERMARK_MARKER = "bidlik-wm";

const DEFAULTS = {
  maxDimension: 1920,
  quality: 0.85,
  watermark: true,
  outputType: "image/jpeg" as const,
};

function extForType(type: string): string {
  if (type === "image/webp") return "webp";
  if (type === "image/png") return "png";
  return "jpg";
}

let watermarkImgPromise: Promise<HTMLImageElement | null> | null = null;

function loadWatermark(): Promise<HTMLImageElement | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (watermarkImgPromise) return watermarkImgPromise;
  watermarkImgPromise = new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = bidlikMark;
  });
  return watermarkImgPromise;
}

function loadBlobAsImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Impossible de charger l'image"));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Échec de l'encodage image"))),
      type,
      quality,
    );
  });
}

export class ClientImageProcessor implements ImageProcessor {
  readonly name = "client-canvas";

  canProcess(file: File | Blob): boolean {
    const t = (file as File).type ?? "";
    return t.startsWith("image/") && t !== "image/gif" && t !== "image/svg+xml";
  }

  async process(file: File | Blob, options: ImageProcessOptions = {}): Promise<ProcessedImage> {
    const opts = { ...DEFAULTS, ...options };
    const asFile = file as File;
    const alreadyProcessed = typeof asFile.name === "string" && asFile.name.includes(WATERMARK_MARKER);

    // Idempotency: if the file was already produced by this pipeline, return as-is.
    if (alreadyProcessed) {
      const bmp = await loadBlobAsImage(file).catch(() => null);
      return {
        blob: file,
        contentType: asFile.type || opts.outputType,
        extension: extForType(asFile.type || opts.outputType),
        width: bmp?.naturalWidth ?? 0,
        height: bmp?.naturalHeight ?? 0,
        alreadyProcessed: true,
      };
    }

    const img = await loadBlobAsImage(file);
    const srcW = img.naturalWidth;
    const srcH = img.naturalHeight;
    const longest = Math.max(srcW, srcH);
    const scale = longest > opts.maxDimension ? opts.maxDimension / longest : 1;
    const outW = Math.max(1, Math.round(srcW * scale));
    const outH = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponible");
    ctx.drawImage(img, 0, 0, outW, outH);

    if (opts.watermark) {
      const wm = await loadWatermark();
      if (wm) {
        const wmW = Math.round(outW * 0.12);
        const ratio = wm.naturalHeight / wm.naturalWidth || 0.4;
        const wmH = Math.round(wmW * ratio);
        const margin = Math.round(outW * 0.02);
        ctx.globalAlpha = 0.55;
        ctx.drawImage(wm, outW - wmW - margin, outH - wmH - margin, wmW, wmH);
        ctx.globalAlpha = 1;
      }
    }

    const blob = await canvasToBlob(canvas, opts.outputType, opts.quality);
    return {
      blob,
      contentType: opts.outputType,
      extension: extForType(opts.outputType),
      width: outW,
      height: outH,
      alreadyProcessed: false,
    };
  }
}
