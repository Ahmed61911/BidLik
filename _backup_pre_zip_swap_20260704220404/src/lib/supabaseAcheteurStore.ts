/**
 * Acheteur (buyer) store backed by Supabase.
 * Exposes the same hook API as the legacy mock — components don't change.
 *
 * Data sources:
 *  - Mes enchères: derived from `bids` (mine) + `auctions` + `cars`.
 *  - Notifications: `notifications` table (triggers push outbid/won/lost).
 *  - Paiements: caution from `profiles.caution_montant` + derived rows for wins.
 *
 * Live updates: subscribes to `auctions`, `bids` and `notifications` realtime
 * channels and refetches the relevant slice on change.
 */

import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { MonEnchere, Notification, Paiement, EnchereStatus, NotifType } from "@/types/acheteur";
import { api } from "./api";

interface Snapshot {
  encheres: MonEnchere[];
  paiements: Paiement[];
  notifications: Notification[];
  userId: string | null;
}

let snapshot: Snapshot = {
  encheres: [],
  paiements: [],
  notifications: [],
  userId: null,
};

const listeners = new Set<() => void>();
function emit() { listeners.forEach((l) => l()); }

let installed = false;
let refreshing = false;

async function getUid(): Promise<string | null> {
  if (snapshot.userId) return snapshot.userId;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

type AuctionRow = {
  id: string;
  car_id: string;
  current_price: number;
  bid_count: number;
  ends_at: string;
  status: string;
};
type CarRow = {
  id: string;
  marque: string;
  modele: string;
  annee: number;
  prix_attendu: number;
};

function deriveEnchereStatus(auctionStatus: string, isLeader: boolean): EnchereStatus {
  if (auctionStatus === "validated") return isLeader ? "gagnee" : "perdue";
  if (auctionStatus === "cancelled") return "perdue";
  if (auctionStatus === "closed") return isLeader ? "en_attente_validation" : "perdue";
  return "active"; // scheduled or live
}

async function refreshEncheres(uid: string) {
  // 1. My max bid per auction
  const { data: bids } = await supabase
    .from("bids")
    .select("auction_id, amount")
    .eq("bidder_id", uid)
    .order("amount", { ascending: false });
  if (!bids || bids.length === 0) {
    snapshot = { ...snapshot, encheres: [] };
    return;
  }
  const myMax = new Map<string, number>();
  bids.forEach((b) => {
    if (!myMax.has(b.auction_id)) myMax.set(b.auction_id, b.amount);
  });
  const auctionIds = Array.from(myMax.keys());

  const { data: auctions } = await supabase
    .from("auctions")
    .select("id, car_id, current_price, bid_count, ends_at, status")
    .in("id", auctionIds);
  const aRows = (auctions ?? []) as AuctionRow[];

  // Fetch which of these auctions the current user is currently leading. top_bidder_id
  // is not exposed to authenticated users; a role-scoped RPC returns only ids the caller leads.
  const { data: leadingRows } = await supabase.rpc("my_leading_auctions", { p_ids: auctionIds });
  const leadingSet = new Set(((leadingRows ?? []) as Array<{ auction_id: string }>).map((r) => r.auction_id));

  const carIds = Array.from(new Set(aRows.map((a) => a.car_id)));
  const { data: cars } = await supabase
    .from("cars")
    .select("id, marque, modele, annee, prix_attendu")
    .in("id", carIds);
  const carMap = new Map<string, CarRow>();
  ((cars ?? []) as CarRow[]).forEach((c) => carMap.set(c.id, c));

  const encheres: MonEnchere[] = aRows.map((a) => {
    const car = carMap.get(a.car_id);
    const isLeader = leadingSet.has(a.id);
    return {
      auctionId: a.id,
      carId: a.car_id,
      marque: car?.marque ?? "",
      modele: car?.modele ?? "",
      annee: car?.annee ?? 0,
      monMontant: myMax.get(a.id) ?? 0,
      prixActuel: a.current_price,
      prixAttendu: car?.prix_attendu ?? 0,
      jeSuisLeader: isLeader,
      endsAt: a.ends_at,
      status: deriveEnchereStatus(a.status, isLeader),
      bidCount: a.bid_count,
    };
  });
  encheres.sort((a, b) => new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime());
  snapshot = { ...snapshot, encheres };
}

async function refreshNotifications(uid: string) {
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(50);
  const notifications: Notification[] = (data ?? []).map((n) => ({
    id: n.id,
    type: n.type as NotifType,
    titre: n.titre,
    message: n.message,
    createdAt: n.created_at,
    read: n.read,
    auctionId: n.auction_id ?? undefined,
  }));
  snapshot = { ...snapshot, notifications };
}

async function refreshPaiements(uid: string) {
  // Source of truth = `payments` table (admin-recorded settlements + caution).
  const { data: rows } = await supabase
    .from("payments")
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });

  const mapType = (t: string): Paiement["type"] => {
    if (t === "caution" || t === "achat" || t === "commission" || t === "virement_vendeur" || t === "remboursement") {
      return t as Paiement["type"];
    }
    return "achat";
  };
  const mapStatus = (s: string): Paiement["status"] => {
    if (s === "paye") return "regle";
    if (s === "rembourse") return "rembourse";
    if (s === "annule") return "rejete";
    return "en_attente";
  };
  const carIds = Array.from(new Set(((rows ?? []) as Array<{ car_id: string | null }>).map((r) => r.car_id).filter(Boolean) as string[]));
  const carById = new Map<string, { marque: string; modele: string; annee: number }>();
  if (carIds.length > 0) {
    const { data: cars } = await supabase
      .from("cars")
      .select("id, marque, modele, annee")
      .in("id", carIds);
    (cars ?? []).forEach((c) => carById.set(c.id as string, { marque: c.marque as string, modele: c.modele as string, annee: c.annee as number }));
  }

  const paiements: Paiement[] = ((rows ?? []) as Array<Record<string, unknown>>).map((r) => {
    const carId = (r.car_id as string) ?? null;
    const car = carId ? carById.get(carId) : undefined;
    const type = mapType(r.type as string);
    const libelle = car
      ? `${car.marque} ${car.modele} (${car.annee})`
      : type === "caution"
        ? "Dépôt de caution"
        : type === "remboursement"
          ? "Remboursement"
          : "Paiement";
    return {
      id: r.id as string,
      date: (r.paid_at as string) ?? (r.created_at as string),
      type,
      libelle,
      montant: r.amount as number,
      status: mapStatus(r.status as string),
      reference: (r.reference as string) ?? "",
      auctionId: (r.auction_id as string) ?? undefined,
      proofUrl: (r.proof_url as string) ?? undefined,
      proofName: (r.proof_name as string) ?? undefined,
      notes: (r.notes as string) ?? undefined,
      paymentMethod: (r.payment_method as string) ?? undefined,
      bank: (r.bank as string) ?? undefined,
    };
  });
  paiements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  snapshot = { ...snapshot, paiements };
}

async function refreshAll() {
  if (refreshing) return;
  refreshing = true;
  try {
    const uid = await getUid();
    if (!uid) {
      snapshot = { encheres: [], paiements: [], notifications: [], userId: null };
      emit();
      return;
    }
    snapshot = { ...snapshot, userId: uid };
    await refreshEncheres(uid);
    await refreshNotifications(uid);
    await refreshPaiements(uid);
    emit();
  } finally {
    refreshing = false;
  }
}

function install() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  void refreshAll();

  supabase.auth.onAuthStateChange((event) => {
    // Only react to identity transitions. INITIAL_SESSION and TOKEN_REFRESHED
    // fire on every mount / hourly refresh and would thrash the store.
    if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
    snapshot = { encheres: [], paiements: [], notifications: [], userId: null };
    void refreshAll();
  });


  // Realtime: any auction/bid/notification change triggers a coalesced refresh.
  const channel = supabase
    .channel("acheteur-store")
    .on("postgres_changes", { event: "*", schema: "public", table: "auctions" }, () => {
      void refreshAll();
    })
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "bids" }, () => {
      void refreshAll();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
      void refreshAll();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => {
      void refreshAll();
    });
  channel.subscribe();
}

import { storage, paymentPaths } from "@/lib/storage";

export async function signedPaymentProofUrl(path: string): Promise<string> {
  return storage.signedUrl("payment-proofs", path);
}

/* ─────────── Buyer post-closure payment workflow ─────────── */

export interface PendingPaymentAuction {
  auctionId: string;
  carId: string;
  marque: string;
  modele: string;
  annee: number;
  prixFinal: number;
  validatedAt: string | null;
  paymentDeadline: string | null;
  paymentStatus: "none" | "en_attente" | "paye" | "annule";
  paymentId: string | null;
  proofUrl: string | null;
  proofName: string | null;
}

export async function listMyPendingPaymentAuctions(): Promise<PendingPaymentAuction[]> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return [];

  // Use SECURITY DEFINER RPC — top_bidder_id is not directly readable by authenticated users.
  const { data: rawAuctions, error } = await supabase.rpc("list_my_pending_payment_auctions");
  if (error) throw new Error(error.message);
  const auctionRows = (rawAuctions ?? []) as Array<{
    id: string;
    car_id: string;
    current_price: number;
    validated_at: string | null;
    payment_deadline: string | null;
    status: string;
  }>;
  const auctionIds = auctionRows.map((a) => a.id);
  // Fetch safe car info in a second call
  const carIds = Array.from(new Set(auctionRows.map((a) => a.car_id)));
  const carMap = new Map<string, { marque: string; modele: string; annee: number }>();
  if (carIds.length > 0) {
    const { data: cars } = await supabase
      .from("cars")
      .select("id, marque, modele, annee")
      .in("id", carIds);
    (cars ?? []).forEach((c) =>
      carMap.set(c.id as string, { marque: c.marque as string, modele: c.modele as string, annee: c.annee as number }),
    );
  }
  const payByAuction = new Map<string, { id: string; status: string; proof_url: string | null; proof_name: string | null }>();
  if (auctionIds.length > 0) {
    const { data: pays } = await supabase
      .from("payments")
      .select("id, auction_id, status, proof_url, proof_name")
      .in("auction_id", auctionIds)
      .eq("user_id", uid)
      .eq("type", "achat");
    (pays ?? []).forEach((p) =>
      payByAuction.set(p.auction_id as string, {
        id: p.id as string,
        status: p.status as string,
        proof_url: (p.proof_url as string) ?? null,
        proof_name: (p.proof_name as string) ?? null,
      }),
    );
  }

  return auctionRows.map((a) => {
    const car = carMap.get(a.car_id) ?? null;
    const p = payByAuction.get(a.id);
    return {
      auctionId: a.id,
      carId: a.car_id,
      marque: car?.marque ?? "",
      modele: car?.modele ?? "",
      annee: car?.annee ?? 0,
      prixFinal: a.current_price,
      validatedAt: a.validated_at,
      paymentDeadline: a.payment_deadline,
      paymentStatus: (p?.status as PendingPaymentAuction["paymentStatus"]) ?? "none",
      paymentId: p?.id ?? null,
      proofUrl: p?.proof_url ?? null,
      proofName: p?.proof_name ?? null,
    };
  });
}

/**
 * Upload a buyer's payment proof for a car they've won.
 * File is stored under `cars/{carId}/payments/…` via the central storage service.
 */
export async function uploadBuyerProof(
  file: File,
  carId: string,
): Promise<{ path: string; name: string }> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Connexion requise");
  if (!carId) throw new Error("Véhicule requis");
  const result = await storage.uploadFile({
    file,
    bucket: "payment-proofs",
    buildPath: (ext) => paymentPaths.carPayment(carId, uid, ext),
  });
  return { path: result.path, name: result.name };
}

export async function submitBuyerPayment(input: {
  auctionId: string;
  amount: number;
  reference: string;
  proofUrl: string;
  proofName: string;
  notes?: string;
  paymentMethod?: string | null;
  bank?: string | null;
  dueDate?: string | null;
}): Promise<void> {
  const { error } = await supabase.rpc("buyer_submit_payment", {
    p_auction_id: input.auctionId,
    p_amount: Math.round(input.amount),
    p_reference: input.reference,
    p_proof_url: input.proofUrl,
    p_proof_name: input.proofName,
    p_notes: input.notes ?? "",
    p_payment_method: input.paymentMethod ?? null,
    p_bank: input.bank ?? null,
    p_due_date: input.dueDate ?? null,
  } as never);
  if (error) throw new Error(error.message);
}

export const acheteurStore = {
  getEncheres(): MonEnchere[] { install(); return snapshot.encheres; },
  getPaiements(): Paiement[] { install(); return snapshot.paiements; },
  getNotifications(): Notification[] { install(); return snapshot.notifications; },
  unreadCount(): number { return snapshot.notifications.filter((n) => !n.read).length; },
  async markAllRead() {
    const uid = await getUid();
    if (!uid) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", uid).eq("read", false);
    void refreshAll();
  },
  async markRead(id: string) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    void refreshAll();
  },
  subscribe(l: () => void) {
    install();
    listeners.add(l);
    return () => { listeners.delete(l); };
  },
};

/* React hooks (stable references via memoized snapshots) */

export function useMesEncheres(): MonEnchere[] {
  return useSyncExternalStore(acheteurStore.subscribe, acheteurStore.getEncheres, () => []);
}
export function useMesPaiements(): Paiement[] {
  return useSyncExternalStore(acheteurStore.subscribe, acheteurStore.getPaiements, () => []);
}
export function useMesNotifications(): Notification[] {
  return useSyncExternalStore(acheteurStore.subscribe, acheteurStore.getNotifications, () => []);
}

export { api };
