/**
 * Ported from webapp/src/lib/supabaseApi.ts — same RPCs, same column
 * projections, same masking rules. Keep in sync with the webapp; this is the
 * shared backend contract, not mobile-specific behavior.
 */
import { supabase } from "@/services/supabase/client";
import type { Auction, AuctionStatus, AuctionType, AuctionVisibility, Bid, Car, CarExpertise, InspectionChecklist } from "@/types";

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
  prix_plancher: number;
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

const PUBLIC_CAR_COLUMNS =
  "id, type, marque, modele, finition, transmission, carburant, " +
  "annee, kilometrage, couleur_exterieur, couleur_interieur, note_expert, " +
  "nombre_cles, puissance_fiscale, images, status, prix_plancher, created_at, updated_at";

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
    prixPlancher: row.prix_plancher ?? 0,
    minimumAcceptedPrice: row.minimum_accepted_price ?? undefined,
    images: Array.isArray(row.images) ? row.images : [],
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

export type AuctionFilter = "live" | "closed" | "all";

export async function listAuctions(filter: AuctionFilter): Promise<Auction[]> {
  await tick();
  let q = supabase
    .from("auctions")
    .select(`${PUBLIC_AUCTION_COLUMNS}, cars(${PUBLIC_CAR_COLUMNS})`)
    .order("ends_at", { ascending: true });
  if (filter === "live") q = q.in("status", ["live", "scheduled"]);
  else if (filter === "closed") q = q.in("status", ["closed", "validated", "cancelled"]);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data as unknown as AuctionRow[]).map((r) => mapAuction(r));
}

export async function getAuction(id: string): Promise<Auction> {
  await tick();
  const { data, error } = await supabase
    .from("auctions")
    .select(`${PUBLIC_AUCTION_COLUMNS}, cars(${PUBLIC_CAR_COLUMNS})`)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Enchère introuvable");
  const auction = mapAuction(data as unknown as AuctionRow);
  // Enrich topBidderId with the caller's own identity when they lead — the
  // only case the client can safely know the top bidder id.
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
}

export async function listBids(auctionId: string): Promise<Bid[]> {
  // Bidder identity is masked at the database via the list_auction_bids RPC —
  // only the bidder themselves and admins receive the real bidder_name.
  const [{ data, error }, { data: userRes }] = await Promise.all([
    supabase.rpc("list_auction_bids", { p_auction_id: auctionId }),
    supabase.auth.getUser(),
  ]);
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
  const myId = userRes.user?.id ?? "";
  return ((data as Row[]) ?? []).map((r) =>
    mapBid({
      id: r.id,
      auction_id: r.auction_id,
      car_id: r.car_id,
      bidder_id: r.is_own ? myId : "",
      bidder_name: r.bidder_name ?? "Anonyme",
      amount: r.amount,
      is_auto: r.is_auto,
      created_at: r.created_at,
    }),
  );
}

export async function placeBid(input: { auctionId: string; amount: number; isAuto?: boolean }): Promise<Bid> {
  const { data, error } = await supabase.rpc("place_bid", {
    p_auction_id: input.auctionId,
    p_amount: Math.round(input.amount),
    p_is_auto: !!input.isAuto,
  });
  if (error) throw new Error(error.message);
  return mapBid(data as BidRow);
}

export async function setAutoBid(
  auctionId: string,
  enabled: boolean,
  maxAmount?: number,
): Promise<{ enabled: boolean; maxAmount: number }> {
  const { data, error } = await supabase.rpc("set_auto_bid", {
    p_auction_id: auctionId,
    p_enabled: enabled,
    p_max_amount: maxAmount ?? null,
  } as never);
  if (error) throw new Error(error.message);
  const row = data as { enabled: boolean; max_amount: number };
  return { enabled: row.enabled, maxAmount: row.max_amount };
}

export async function getAutoBid(auctionId: string): Promise<{ enabled: boolean; maxAmount: number } | null> {
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes.user) return null;
  const { data, error } = await supabase
    .from("auto_bids")
    .select("enabled, max_amount")
    .eq("auction_id", auctionId)
    .eq("user_id", userRes.user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { enabled: data.enabled, maxAmount: data.max_amount };
}

export async function getCarExpertise(carId: string): Promise<CarExpertise | null> {
  const { data, error } = await supabase.rpc("get_car_expertise", { p_car_id: carId } as never);
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? (data[0] as Record<string, unknown> | undefined) : (data as Record<string, unknown> | null);
  if (!row) return null;
  const rawImages = row.expert_images;
  const images = Array.isArray(rawImages) ? (rawImages as string[]) : null;
  return {
    noteFinale: (row.note_finale as number | null) ?? null,
    commentaire: (row.commentaire as string | null) ?? null,
    checklist: (row.checklist as InspectionChecklist | null) ?? null,
    rapportUrl: (row.rapport_url as string | null) ?? null,
    rapportName: (row.rapport_name as string | null) ?? null,
    rapportRecuLe: (row.rapport_recu_le as string | null) ?? null,
    expertImages: images,
  };
}
