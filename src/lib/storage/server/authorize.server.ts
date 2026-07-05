/**
 * Authorization for storage reads/writes — server-only. Mirrors the
 * Postgres RLS logic that used to live on storage.objects (see the removed
 * storage_can_write_* functions in supabase/migrations/) now that the
 * Storage API is no longer in the path. Uses supabaseAdmin (service role)
 * because these checks run entirely server-side, before any file I/O.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { parseCarIdFromPath, parseUserIdFromPath } from "../paths";
import { PUBLIC_CATEGORIES } from "../validation";
import type { FileCategory, StorageBucket } from "../types";

async function hasRole(userId: string, role: "admin" | "acheteur" | "vendeur" | "expert"): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", role)
    .maybeSingle();
  return !!data;
}

async function isAdmin(userId: string): Promise<boolean> {
  return hasRole(userId, "admin");
}

async function isCarOwner(userId: string, carId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("cars")
    .select("vendeur_id")
    .eq("id", carId)
    .maybeSingle();
  return !!data && data.vendeur_id === userId;
}

async function isAssignedExpert(userId: string, carId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("expert_assignments")
    .select("expert_id")
    .eq("car_id", carId)
    .maybeSingle();
  return !!data && data.expert_id === userId;
}

async function isWinningBuyer(userId: string, carId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("auctions")
    .select("id")
    .eq("car_id", carId)
    .eq("top_bidder_id", userId)
    .in("status", ["validated", "closed"])
    .limit(1);
  return !!data && data.length > 0;
}

/** Can `userId` upload a new file at `path` in `bucket`? */
export async function canWrite(
  bucket: StorageBucket,
  path: string,
  userId: string,
): Promise<boolean> {
  if (bucket === "car-images") {
    const carId = parseCarIdFromPath(path);
    if (!carId) return false;
    if (await isAdmin(userId)) return true;
    if (await isCarOwner(userId, carId)) return true;
    if (await isAssignedExpert(userId, carId)) return true;
    return false;
  }

  if (bucket === "payment-proofs" || bucket === "identity") {
    const targetUserId = parseUserIdFromPath(path);
    if (!targetUserId) return false;
    if (targetUserId === userId) return true;
    return isAdmin(userId);
  }

  if (bucket === "avatars") {
    // No embedded owner in the path — the caller always writes their own avatar.
    return true;
  }

  return false;
}

/** Can `userId` read the file described by this storage_files row? */
export async function canRead(
  category: FileCategory,
  owner: string | null,
  carId: string | null,
  userId: string | null,
): Promise<boolean> {
  if (PUBLIC_CATEGORIES.has(category)) return true;
  if (!userId) return false;
  if (await isAdmin(userId)) return true;
  if (owner === userId) return true;

  // Expertise photos: restricted to admin, the car's own vendeur, and its
  // assigned expert (see get_car_expertise() RPC — matches
  // auctions.$auctionId.tsx's canPreviewPhotos, which now derives directly
  // from whether that RPC returned expert_images at all). Buyers no longer
  // get a blanket bypass here.
  if (carId) {
    if (await isCarOwner(userId, carId)) return true;
    if (await isAssignedExpert(userId, carId)) return true;
    if (category === "report" && (await isWinningBuyer(userId, carId))) return true;
  }
  return false;
}
