/**
 * Seller (vendeur) API — ported from webapp/src/lib/supabaseVendeurApi.ts.
 * Read-only subset (listCars/getCar/getStats/listPayouts): the mobile app
 * does NOT implement car submission or cancellation — those stay a
 * webapp/admin flow (see architecture plan §8). Same SECURITY DEFINER RPCs,
 * same stage-derivation logic.
 */
import { supabase } from "@/services/supabase/client";
import type { Car, CarStatus, PaymentStatus, DeliveryStatus, SellerCar, SellerCarStage, SellerPayout, SellerStats } from "@/types";

const COMMISSION_RATE = 0.05;

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Non authentifié");
  return data.user.id;
}

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toISOString().slice(0, 10);
}

interface CarRow {
  id: string;
  marque: string;
  modele: string;
  annee: number;
  kilometrage: number;
  prix_plancher: number;
  note_expert: number | null;
  status: CarStatus;
  payment_status: PaymentStatus;
  delivery_status: DeliveryStatus;
  created_at: string;
}
interface AuctionRow {
  id: string;
  car_id: string;
  status: string;
  current_price: number;
  bid_count: number;
  top_bidder_id: string | null;
}
interface AssignmentRow {
  car_id: string;
  status: string;
  expert_id: string | null;
}

export function deriveStage(car: CarRow, auction: AuctionRow | undefined, assignment: AssignmentRow | undefined): SellerCarStage {
  if (car.status === "vendu_validee") return "vendu";
  if (car.status === "vendu_annulee") return "annulee";
  if (auction) {
    if (auction.status === "validated") return "vendu";
    if (auction.status === "cancelled") return "annulee";
    if (auction.status === "closed") return "en_attente_validation";
    return "en_enchere"; // scheduled or live
  }
  if (assignment) {
    if (assignment.status === "rapport_recu") return "rapport_recu";
    if (assignment.status === "en_inspection") return "en_inspection";
  }
  return "brouillon";
}

async function fetchMyCars(): Promise<SellerCar[]> {
  const { data: carsRaw, error } = await supabase.rpc("list_my_seller_cars" as never);
  if (error) throw error;
  const rows = ((carsRaw ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    marque: r.marque as string,
    modele: r.modele as string,
    annee: r.annee as number,
    kilometrage: r.kilometrage as number,
    prix_plancher: r.prix_plancher as number,
    note_expert: (r.note_expert as number | null) ?? null,
    status: r.status as CarStatus,
    payment_status: r.payment_status as PaymentStatus,
    delivery_status: r.delivery_status as DeliveryStatus,
    created_at: r.created_at as string,
  })) as CarRow[];
  if (rows.length === 0) return [];
  const carIds = rows.map((c) => c.id);

  const { data: rawAuctions, error: auctionsErr } = await supabase.rpc("seller_list_my_car_auctions" as never);
  const assignmentsRes = await supabase.from("expert_assignments").select("car_id, status, expert_id").in("car_id", carIds);
  if (auctionsErr) throw auctionsErr;
  if (assignmentsRes.error) throw assignmentsRes.error;

  const auctionMap = new Map<string, AuctionRow>();
  ((rawAuctions ?? []) as AuctionRow[]).filter((a) => carIds.includes(a.car_id)).forEach((a) => auctionMap.set(a.car_id, a));
  const assignMap = new Map<string, AssignmentRow>();
  ((assignmentsRes.data ?? []) as AssignmentRow[]).forEach((a) => assignMap.set(a.car_id, a));

  const expertIds = Array.from(new Set(Array.from(assignMap.values()).map((a) => a.expert_id).filter((v): v is string => !!v)));
  const buyerIds = Array.from(new Set(Array.from(auctionMap.values()).map((a) => a.top_bidder_id).filter((v): v is string => !!v)));
  const allProfileIds = Array.from(new Set([...expertIds, ...buyerIds]));
  const nameMap = new Map<string, string>();
  if (allProfileIds.length > 0) {
    const { data: profs } = await supabase.from("profiles").select("user_id, nom").in("user_id", allProfileIds);
    (profs ?? []).forEach((p) => nameMap.set(p.user_id, p.nom ?? ""));
  }

  return rows.map((c) => {
    const auction = auctionMap.get(c.id);
    const assignment = assignMap.get(c.id);
    const stage = deriveStage(c, auction, assignment);
    return {
      id: c.id,
      marque: c.marque,
      modele: c.modele,
      annee: c.annee,
      kilometrage: c.kilometrage,
      prixPlancher: c.prix_plancher,
      noteExpert: c.note_expert,
      stage,
      soumisLe: fmtDate(c.created_at),
      expertNom: assignment?.expert_id ? nameMap.get(assignment.expert_id) ?? null : null,
      prixCourant: auction?.current_price ?? null,
      bidCount: auction?.bid_count ?? null,
      prixFinal: auction && ["closed", "validated", "cancelled"].includes(auction.status) ? auction.current_price : null,
      acheteurNom: auction?.top_bidder_id ? nameMap.get(auction.top_bidder_id) ?? null : null,
      paymentStatus: stage === "vendu" || stage === "en_attente_validation" ? c.payment_status : null,
      deliveryStatus: stage === "vendu" || stage === "en_attente_validation" ? c.delivery_status : null,
      carStatus: c.status,
      auctionId: auction?.id ?? null,
    } satisfies SellerCar;
  });
}

interface CarFullRow {
  id: string;
  vendeur_id: string | null;
  vendeur_nom: string;
  type: Car["type"];
  body_type: string | null;
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
  prix_minimum: number | null;
  minimum_accepted_price: number | null;
  images: string[] | null;
}

function mapCarFull(row: CarFullRow): Car {
  return {
    id: row.id,
    vendeurId: row.vendeur_id ?? "",
    vendeurNom: row.vendeur_nom || "Vendeur",
    type: row.type,
    bodyType: row.body_type ?? null,
    marque: row.marque,
    modele: row.modele,
    finition: row.finition,
    transmission: row.transmission,
    carburant: row.carburant,
    annee: row.annee,
    kilometrage: row.kilometrage,
    couleurExterieur: row.couleur_exterieur,
    couleurInterieur: row.couleur_interieur,
    noteExpert: row.note_expert,
    nombreCles: row.nombre_cles,
    opposition: row.opposition,
    mainLevee: row.main_levee,
    puissanceFiscale: row.puissance_fiscale,
    carteGriseBarree: row.carte_grise_barree,
    procuration: row.procuration,
    dateVente: row.date_vente,
    status: row.status,
    paymentStatus: row.payment_status,
    deliveryStatus: row.delivery_status,
    prixPlancher: row.prix_plancher,
    prixMinimum: row.prix_minimum ?? null,
    minimumAcceptedPrice: row.minimum_accepted_price ?? undefined,
    images: Array.isArray(row.images) ? row.images : [],
  };
}

export async function listSellerCars(): Promise<SellerCar[]> {
  return fetchMyCars();
}

/** Full detail for one of the caller's own cars — get_car_full() enforces ownership. */
export async function getSellerCar(carId: string): Promise<Car> {
  const { data, error } = await supabase.rpc("get_car_full", { p_car_id: carId } as never);
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Voiture introuvable");
  return mapCarFull(data as CarFullRow);
}

export async function getSellerStats(): Promise<SellerStats> {
  const cars = await fetchMyCars();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const venduMois = cars.filter((c) => c.stage === "vendu" && c.soumisLe && new Date(c.soumisLe) >= monthStart);
  const caBrutMois = venduMois.reduce((s, c) => s + (c.prixFinal ?? 0), 0);
  const commissionMois = Math.round(caBrutMois * COMMISSION_RATE);
  const caNetMois = caBrutMois - commissionMois;

  const enAttentePayouts = cars.filter((c) => c.stage === "vendu" && c.paymentStatus !== "paye");
  const prochain = enAttentePayouts[0];

  return {
    voituresActives: cars.filter((c) => c.stage !== "annulee").length,
    enInspection: cars.filter((c) => c.stage === "en_inspection").length,
    enEnchereLive: cars.filter((c) => c.stage === "en_enchere").length,
    ventesValideesMois: venduMois.length,
    caBrutMois,
    commissionMois,
    caNetMois,
    prochainPaiement: prochain?.soumisLe ?? null,
    prochainPaiementMontant: prochain ? Math.round((prochain.prixFinal ?? 0) * (1 - COMMISSION_RATE)) : 0,
  };
}

export async function listSellerPayouts(): Promise<SellerPayout[]> {
  const uid = await currentUserId();
  const { data: rows, error } = await supabase
    .from("payments")
    .select("*")
    .eq("user_id", uid)
    .in("type", ["virement_vendeur", "commission"])
    .order("created_at", { ascending: false });
  if (error) throw error;
  const payments = (rows ?? []) as Array<Record<string, unknown>>;
  const carIds = Array.from(new Set(payments.map((r) => r.car_id as string | null).filter(Boolean) as string[]));
  const carMap = new Map<string, { marque: string; modele: string; annee: number }>();
  if (carIds.length > 0) {
    const { data: cars } = await supabase.from("cars").select("id, marque, modele, annee").in("id", carIds);
    (cars ?? []).forEach((c) => carMap.set(c.id as string, { marque: c.marque as string, modele: c.modele as string, annee: c.annee as number }));
  }
  // Group by car so the commission row is netted against the seller transfer.
  const byCar = new Map<string, { net: number; commission: number; date: string; status: SellerPayout["status"] }>();
  for (const r of payments) {
    const carId = (r.car_id as string) ?? "_none_";
    const cur = byCar.get(carId) ?? { net: 0, commission: 0, date: (r.paid_at as string) ?? (r.created_at as string), status: "en_attente" as const };
    const amount = r.amount as number;
    if (r.type === "virement_vendeur") {
      cur.net = amount;
      cur.status = r.status === "paye" ? "vire" : r.status === "annule" ? "annule" : "en_attente";
      cur.date = (r.paid_at as string) ?? (r.created_at as string);
    } else if (r.type === "commission") {
      cur.commission = amount;
    }
    byCar.set(carId, cur);
  }
  return Array.from(byCar.entries()).map(([carId, v]) => {
    const car = carMap.get(carId);
    const prixFinal = v.net + v.commission;
    return {
      id: `pay-${carId}`,
      carId,
      carLabel: car ? `${car.marque} ${car.modele} (${car.annee})` : carId,
      prixFinal,
      commission: v.commission,
      net: v.net,
      status: v.status,
      date: v.date.slice(0, 10),
    } satisfies SellerPayout;
  });
}
