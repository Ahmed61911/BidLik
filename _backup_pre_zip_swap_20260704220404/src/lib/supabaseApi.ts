/**
 * Supabase-backed implementation of ApiClient.
 * Source of truth for auctions, bids (open), offers (sealed), events, cars.
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  Auction,
  AuctionEvent,
  AuctionStatus,
  AuctionType,
  AuctionVisibility,
  Bid,
  Car,
  Offer,
} from "@/types/auction";
import type { ApiClient, PlaceBidInput, SubmitOfferInput } from "./api";
import { getCarImages } from "./carImages";

type CarRow = {
  id: string;
  vendeur_id: string | null;
  vendeur_nom: string;
  type: Car["type"];
  marque: string;
  modele: string;
  finition: string;
  transmission: Car["transmission"];
  carburant: Car["carburant"];
  annee: number;
  kilometrage: number;
  couleur_exterieur: string;
  couleur_interieur: string;
  note_expert: number | null;
  nombre_cles: number;
  opposition: boolean;
  main_levee: boolean;
  puissance_fiscale: number;
  carte_grise_barree: boolean;
  procuration: Car["procuration"];
  date_vente: string | null;
  status: Car["status"];
  payment_status: Car["paymentStatus"];
  delivery_status: Car["deliveryStatus"];
  prix_attendu: number;
  minimum_accepted_price: number | null;
  images: string[] | null;
};

type AuctionRow = {
  id: string;
  car_id: string;
  event_id: string | null;
  starts_at: string;
  ends_at: string;
  starting_price: number;
  current_price: number;
  bid_count: number;
  status: AuctionStatus;
  visibility: AuctionVisibility;
  auction_type: AuctionType;
  top_bidder_id?: string | null;
  cars?: (Partial<CarRow> & { id: string; marque: string; modele: string }) | null;
};

type BidRow = {
  id: string;
  auction_id: string;
  car_id: string;
  bidder_id: string;
  bidder_name: string;
  amount: number;
  is_auto: boolean;
  created_at: string;
};

type OfferRow = {
  id: string;
  auction_id: string;
  car_id: string;
  user_id: string;
  user_name: string;
  amount: number;
  status: Offer["status"];
  created_at: string;
  updated_at: string;
};

type EventRow = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: AuctionStatus;
  visibility: AuctionVisibility;
};

// Columns safe to expose to anonymous (non-signed-in) visitors. Sensitive
// financial and legal fields are excluded — also enforced at the database
// layer via column-level GRANTs to the `anon` role.
const PUBLIC_CAR_COLUMNS =
  "id, type, marque, modele, finition, transmission, carburant, " +
  "annee, kilometrage, couleur_exterieur, couleur_interieur, note_expert, " +
  "nombre_cles, puissance_fiscale, images, status, created_at, updated_at";


// Auction columns safe for anon — excludes top_bidder_id (user identity).
const PUBLIC_AUCTION_COLUMNS =
  "id, car_id, event_id, starts_at, ends_at, starting_price, current_price, " +
  "bid_count, status, visibility, auction_type, created_at, updated_at";

function mapCar(row: Partial<CarRow> & { id: string; marque: string; modele: string }): Car {
  return {
    id: row.id,
    vendeurId: row.vendeur_id ?? "",
    vendeurNom: row.vendeur_nom || "Vendeur",
    type: (row.type ?? "particulier") as Car["type"],
    marque: row.marque,
    modele: row.modele,
    finition: row.finition ?? "",
    transmission: (row.transmission ?? "automatique") as Car["transmission"],
    carburant: (row.carburant ?? "diesel") as Car["carburant"],
    annee: row.annee ?? 0,
    kilometrage: row.kilometrage ?? 0,
    couleurExterieur: row.couleur_exterieur ?? "",
    couleurInterieur: row.couleur_interieur ?? "",
    noteExpert: row.note_expert ?? null,
    nombreCles: row.nombre_cles ?? 0,
    opposition: row.opposition ?? false,
    mainLevee: row.main_levee ?? true,
    puissanceFiscale: row.puissance_fiscale ?? 0,
    carteGriseBarree: row.carte_grise_barree ?? false,
    procuration: (row.procuration ?? "procuration") as Car["procuration"],
    dateVente: row.date_vente ?? null,
    status: (row.status ?? "open") as Car["status"],
    paymentStatus: (row.payment_status ?? "non_paye") as Car["paymentStatus"],
    deliveryStatus: (row.delivery_status ?? "non_livre") as Car["deliveryStatus"],
    prixAttendu: row.prix_attendu ?? 0,
    minimumAcceptedPrice: row.minimum_accepted_price ?? undefined,
    images: row.images && row.images.length ? row.images : getCarImages(row.marque),
  };
}

function mapAuction(row: AuctionRow, carOverride?: Car): Auction {
  const car = carOverride ?? (row.cars ? mapCar(row.cars) : null);
  if (!car) throw new Error("Voiture introuvable pour l'enchère " + row.id);
  return {
    id: row.id,
    car,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    currentPrice: row.current_price,
    startingPrice: row.starting_price,
    bidCount: row.bid_count,
    status: row.status,
    visibility: row.visibility,
    topBidderId: row.top_bidder_id ?? null,
    auctionType: row.auction_type,
    eventId: row.event_id,
  };
}

function mapBid(row: BidRow): Bid {
  return {
    id: row.id,
    auctionId: row.auction_id,
    carId: row.car_id,
    bidderId: row.bidder_id,
    bidderName: row.bidder_name,
    amount: row.amount,
    createdAt: row.created_at,
    isAuto: row.is_auto,
  };
}

function mapOffer(row: OfferRow): Offer {
  return {
    id: row.id,
    auctionId: row.auction_id,
    carId: row.car_id,
    userId: row.user_id,
    userName: row.user_name,
    amount: row.amount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
  };
}

function mapEvent(row: EventRow, lotIds: string[]): AuctionEvent {
  return {
    id: row.id,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    visibility: row.visibility,
    lotIds,
  };
}

/** Lightweight tick — promotes scheduled→live and live→closed. Fire-and-forget. */
let lastTick = 0;
async function tick() {
  const now = Date.now();
  if (now - lastTick < 5000) return;
  lastTick = now;
  try {
    await supabase.rpc("tick_auctions");
  } catch {
    /* swallow */
  }
}

export const supabaseApi: ApiClient = {
  async listAuctions(filter) {
    await tick();
    // Always use the safe column projection — sensitive fields (top_bidder_id, reserve prices)
    // are restricted at the DB layer via column-level GRANTs and are fetched through
    // role-scoped SECURITY DEFINER RPCs when needed.
    let q = supabase
      .from("auctions")
      .select(`${PUBLIC_AUCTION_COLUMNS}, cars(${PUBLIC_CAR_COLUMNS})`)
      .order("ends_at", { ascending: true });
    if (filter === "live") q = q.in("status", ["live", "scheduled"]);
    else if (filter === "closed") q = q.in("status", ["closed", "validated", "cancelled"]);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data as unknown as AuctionRow[]).map((r) => mapAuction(r));
  },

  async getAuction(id) {
    await tick();
    const { data, error } = await supabase
      .from("auctions")
      .select(`${PUBLIC_AUCTION_COLUMNS}, cars(${PUBLIC_CAR_COLUMNS})`)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Enchère introuvable");
    const auction = mapAuction(data as unknown as AuctionRow);
    // Enrich topBidderId with the caller's own identity when they lead — this is the
    // only case where the client can safely know the top bidder id.
    try {
      const { data: leading } = await supabase.rpc("am_i_top_bidder", { p_id: id });
      if (leading === true) {
        const { data: userRes } = await supabase.auth.getUser();
        if (userRes.user) auction.topBidderId = userRes.user.id;
      }
    } catch {
      /* ignore */
    }
    return auction;
  },

  async listBids(auctionId) {
    // Bidder identity is masked at the database via the list_auction_bids RPC.
    // Only the bidder themselves and admins receive the real bidder_name.
    const { data, error } = await supabase.rpc("list_auction_bids", {
      p_auction_id: auctionId,
    });
    if (error) throw new Error(error.message);
    type Row = {
      id: string;
      auction_id: string;
      car_id: string;
      amount: number;
      is_auto: boolean;
      created_at: string;
      bidder_name: string;
      is_own: boolean;
    };
    return ((data as Row[]) ?? []).map((r) =>
      mapBid({
        id: r.id,
        auction_id: r.auction_id,
        car_id: r.car_id,
        bidder_id: "",
        bidder_name: r.bidder_name ?? "Anonyme",
        amount: r.amount,
        is_auto: r.is_auto,
        created_at: r.created_at,
      }),
    );
  },

  async placeBid({ auctionId, amount, isAuto }: PlaceBidInput) {
    const { data, error } = await supabase.rpc("place_bid", {
      p_auction_id: auctionId,
      p_amount: Math.round(amount),
      p_is_auto: !!isAuto,
    });
    if (error) throw new Error(error.message);
    return mapBid(data as BidRow);
  },

  async submitOffer({ auctionId, amount }: SubmitOfferInput) {
    const { data, error } = await supabase.rpc("submit_offer", {
      p_auction_id: auctionId,
      p_amount: Math.round(amount),
    });
    if (error) throw new Error(error.message);
    return mapOffer(data as OfferRow);
  },

  async listMyOffers(auctionId: string) {
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes.user?.id;
    if (!uid) return [];
    const { data, error } = await supabase
      .from("offers")
      .select("*")
      .eq("auction_id", auctionId)
      .eq("user_id", uid)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as OfferRow[]).map(mapOffer);
  },

  async listAllOffersAdmin(auctionId: string) {
    const { data, error } = await supabase
      .from("offers")
      .select("*")
      .eq("auction_id", auctionId)
      .order("amount", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as OfferRow[]).map(mapOffer);
  },

  async setAutoBid() {
    // No-op: stored client-side only for now.
  },

  async listEvents(filter) {
    await tick();
    let q = supabase.from("auction_events").select("*").order("starts_at", { ascending: false });
    if (filter === "live") q = q.in("status", ["live", "scheduled"]);
    else if (filter === "closed") q = q.in("status", ["closed", "validated", "cancelled"]);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const events = data as EventRow[];
    if (events.length === 0) return [];
    const { data: lots, error: lotsErr } = await supabase
      .from("auctions")
      .select("id, event_id")
      .in("event_id", events.map((e) => e.id));
    if (lotsErr) throw new Error(lotsErr.message);
    const byEvent = new Map<string, string[]>();
    for (const l of lots ?? []) {
      const eid = (l as { event_id: string | null }).event_id;
      if (!eid) continue;
      const arr = byEvent.get(eid) ?? [];
      arr.push((l as { id: string }).id);
      byEvent.set(eid, arr);
    }
    return events.map((e) => mapEvent(e, byEvent.get(e.id) ?? []));
  },

  async getEvent(id) {
    await tick();
    const { data: ev, error: evErr } = await supabase
      .from("auction_events")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (evErr) throw new Error(evErr.message);
    if (!ev) throw new Error("Événement d'enchère introuvable");
    const { data: lots, error: lotsErr } = await supabase
      .from("auctions")
      .select(`${PUBLIC_AUCTION_COLUMNS}, cars(${PUBLIC_CAR_COLUMNS})`)
      .eq("event_id", id)
      .order("ends_at", { ascending: true });
    if (lotsErr) throw new Error(lotsErr.message);
    const mappedLots = (lots as unknown as AuctionRow[]).map((r) => mapAuction(r));
    return {
      event: mapEvent(ev as EventRow, mappedLots.map((l) => l.id)),
      lots: mappedLots,
    };
  },
};

/**
 * Fetches the expertise info for a car (note, checklist, commentaire, report,
 * and — only for admins/acheteurs — the inspection photos). Returns null when
 * no expert report has been submitted yet.
 */
export async function getCarExpertise(carId: string): Promise<import("@/types/expert").CarExpertise | null> {
  const { data, error } = await supabase.rpc("get_car_expertise", { p_car_id: carId } as never);
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? (data[0] as Record<string, unknown> | undefined) : (data as Record<string, unknown> | null);
  if (!row) return null;
  const rawImages = row.expert_images;
  const images = Array.isArray(rawImages) ? (rawImages as string[]) : null;
  const rawChecklist = row.checklist as Record<string, unknown> | null;
  return {
    noteFinale: (row.note_finale as number | null) ?? null,
    commentaire: (row.commentaire as string | null) ?? null,
    checklist: rawChecklist as import("@/types/expert").InspectionChecklist | null,
    rapportUrl: (row.rapport_url as string | null) ?? null,
    rapportName: (row.rapport_name as string | null) ?? null,
    rapportRecuLe: (row.rapport_recu_le as string | null) ?? null,
    expertImages: images,
  };
}
