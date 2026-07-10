/**
 * Payment-proof file picking + upload — mobile equivalent of
 * webapp/src/lib/storage/index.ts's uploadFile() for the "caution" and
 * "car-payment" categories (see architecture plan §3). Talks to the same
 * /api/storage/upload REST endpoint, not supabase.storage.
 */
import * as DocumentPicker from "expo-document-picker";
import { supabase } from "@/services/supabase/client";
import { env } from "@/config/env";
import { uuid } from "@/utils/uuid";
import type { StorageBucket } from "./storage";

export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
}

/** Opens the native picker for an image or PDF proof — mirrors the web's accept="image/*,application/pdf". */
export async function pickProofFile(): Promise<PickedFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["image/*", "application/pdf"],
    copyToCacheDirectory: true,
  });
  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.name,
    mimeType: asset.mimeType ?? "application/octet-stream",
  };
}

function extFromName(name: string, mimeType: string): string {
  const fromName = name.includes(".") ? name.split(".").pop() : undefined;
  const cleaned = (fromName ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (cleaned.length > 0 && cleaned.length <= 5) return cleaned;
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "application/pdf") return "pdf";
  return "bin";
}

interface UploadProofInput {
  file: PickedFile;
  bucket: StorageBucket;
  category: "caution" | "car-payment";
  carId?: string;
}

export async function uploadProof({ file, bucket, category, carId }: UploadProofInput): Promise<{ path: string; name: string }> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) throw new Error("Connexion requise");

  const { data: sessionRes } = await supabase.auth.getSession();
  const token = sessionRes.session?.access_token;
  if (!token) throw new Error("Connexion requise");

  const ext = extFromName(file.name, file.mimeType);
  const path = `${uid}/${uuid()}.${ext}`;

  const form = new FormData();
  form.append("bucket", bucket);
  form.append("category", category);
  form.append("path", path);
  form.append("contentType", file.mimeType);
  form.append("originalFilename", file.name);
  if (carId) form.append("carId", carId);
  // React Native's FormData accepts this {uri, name, type} shape for file fields.
  form.append("file", { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);

  const res = await fetch(`${env.API_URL}/api/storage/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const body = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; path?: string; name?: string };
  if (!res.ok || body.ok === false) {
    throw new Error(body.error ?? `Échec de l'envoi (${res.status})`);
  }
  return { path: body.path ?? path, name: body.name ?? file.name };
}
