/**
 * Acheteur (buyer) store — ported from webapp/src/lib/supabaseAcheteurStore.ts,
 * rewritten on Zustand instead of useSyncExternalStore (see other mobile
 * stores). Same data sources and derivation logic:
 *  - Mes enchères: derived from `bids` (mine) + `auctions` + `cars`.
 *  - Notifications: `notifications` table.
 *  - Paiements: `payments` table (admin-recorded settlements + caution).
 * Live updates: subscribes to auctions/bids/notifications/payments realtime
 * and refetches the relevant slice on change.
 */
import { create } from "zustand";
import { supabase } from "@/services/supabase/client";
import type { MonEnchere, Notification, Paiement, EnchereStatus, NotifType } from "@/types";

interface AuctionRow {
  id: string;
  car_id: string;
  current_price: number;
  bid_count: number;
  ends_at: string;
  status: string;
}
interface CarRow {
  id: string;
  marque: string;
  modele: string;
  annee: number;
  prix_plancher: number;
}

function deriveEnchereStatus(auctionStatus: string, isLeader: boolean): EnchereStatus {
  if (auctionStatus === "validated") return isLeader ? "gagnee" : "perdue";
  if (auctionStatus === "cancelled") return "perdue";
  if (auctionStatus === "closed") return isLeader ? "en_attente_validation" : "perdue";
  return "active"; // scheduled or live
}

interface AcheteurState {
  encheres: MonEnchere[];
  paiements: Paiement[];
  notifications: Notification[];
  userId: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
}

async function fetchEncheres(uid: string): Promise<MonEnchere[]> {
  const { data: bids } = await supabase
    .from("bids")
    .select("auction_id, amount")
    .eq("bidder_id", uid)
    .order("amount", { ascending: false });
  if (!bids || bids.length === 0) return [];

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

  // top_bidder_id is not exposed to authenticated users directly — a
  // role-scoped RPC returns only the ids the caller actually leads.
  const { data: leadingRows } = await supabase.rpc("my_leading_auctions", { p_ids: auctionIds } as never);
  const leadingSet = new Set(((leadingRows ?? []) as Array<{ auction_id: string }>).map((r) => r.auction_id));

  const carIds = Array.from(new Set(aRows.map((a) => a.car_id)));
  const { data: cars } = await supabase.from("cars").select("id, marque, modele, annee, prix_plancher").in("id", carIds);
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
      prixPlancher: car?.prix_plancher ?? 0,
      jeSuisLeader: isLeader,
      endsAt: a.ends_at,
      status: deriveEnchereStatus(a.status, isLeader),
      bidCount: a.bid_count,
    };
  });
  encheres.sort((a, b) => new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime());
  return encheres;
}

async function fetchNotifications(uid: string): Promise<Notification[]> {
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []).map((n) => ({
    id: n.id,
    type: n.type as NotifType,
    titre: n.titre,
    message: n.message,
    createdAt: n.created_at,
    read: n.read,
    auctionId: n.auction_id ?? undefined,
  }));
}

async function fetchPaiements(uid: string): Promise<Paiement[]> {
  const { data: rows } = await supabase.from("payments").select("*").eq("user_id", uid).order("created_at", { ascending: false });

  const mapType = (t: string): Paiement["type"] =>
    t === "caution" || t === "achat" || t === "commission" || t === "virement_vendeur" || t === "remboursement"
      ? (t as Paiement["type"])
      : "achat";
  const mapStatus = (s: string): Paiement["status"] => {
    if (s === "paye") return "regle";
    if (s === "rembourse") return "rembourse";
    if (s === "annule") return "rejete";
    return "en_attente";
  };

  const carIds = Array.from(new Set(((rows ?? []) as Array<{ car_id: string | null }>).map((r) => r.car_id).filter(Boolean) as string[]));
  const carById = new Map<string, { marque: string; modele: string; annee: number }>();
  if (carIds.length > 0) {
    const { data: cars } = await supabase.from("cars").select("id, marque, modele, annee").in("id", carIds);
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
  return paiements;
}

let refreshing = false;

export const useAcheteurStore = create<AcheteurState>((set, get) => ({
  encheres: [],
  paiements: [],
  notifications: [],
  userId: null,
  loading: true,

  async refresh() {
    if (refreshing) return;
    refreshing = true;
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      if (!uid) {
        set({ encheres: [], paiements: [], notifications: [], userId: null, loading: false });
        return;
      }
      const [encheres, notifications, paiements] = await Promise.all([
        fetchEncheres(uid),
        fetchNotifications(uid),
        fetchPaiements(uid),
      ]);
      set({ encheres, notifications, paiements, userId: uid, loading: false });
    } finally {
      refreshing = false;
    }
  },

  async markAllRead() {
    const uid = get().userId;
    if (!uid) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", uid).eq("read", false);
    void get().refresh();
  },

  async markRead(id) {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    void get().refresh();
  },
}));

let installed = false;
export function initAcheteurStore() {
  if (installed) return;
  installed = true;

  void useAcheteurStore.getState().refresh();

  supabase.auth.onAuthStateChange((event) => {
    if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
    void useAcheteurStore.getState().refresh();
  });

  supabase
    .channel("acheteur-store")
    .on("postgres_changes", { event: "*", schema: "public", table: "auctions" }, () => void useAcheteurStore.getState().refresh())
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "bids" }, () => void useAcheteurStore.getState().refresh())
    .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => void useAcheteurStore.getState().refresh())
    .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => void useAcheteurStore.getState().refresh())
    .subscribe();
}
