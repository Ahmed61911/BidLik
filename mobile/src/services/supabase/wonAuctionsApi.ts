/**
 * Ported from webapp/src/routes/acheteur.gagnees.index.tsx and
 * acheteur.gagnees.$auctionId.tsx — same RPCs, same row shapes.
 */
import { supabase } from "@/services/supabase/client";
import type { CarExpertise } from "@/types";

export type WonStatus = "en_attente" | "validee" | "livree" | "annulee";

export interface WonRow {
  auctionId: string;
  carId: string;
  marque: string;
  modele: string;
  annee: number;
  prixFinal: number;
  auctionStatus: "closed" | "validated" | "cancelled";
  carStatus: string;
  paymentStatus: "non_paye" | "paye";
  deliveryStatus: "non_livre" | "livre";
  validatedAt: string | null;
  paymentDeadline: string | null;
  closedAt: string | null;
  updatedAt: string;
}

export function computeWonStatus(r: WonRow): WonStatus {
  if (r.auctionStatus === "cancelled" || r.carStatus === "vendu_annulee") return "annulee";
  if (r.deliveryStatus === "livre") return "livree";
  if (r.auctionStatus === "validated") return "validee";
  return "en_attente";
}

export async function listMyWonAuctions(): Promise<WonRow[]> {
  const { data, error } = await supabase.rpc("list_my_won_auctions" as never);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    auctionId: r.auction_id as string,
    carId: r.car_id as string,
    marque: r.marque as string,
    modele: r.modele as string,
    annee: r.annee as number,
    prixFinal: r.prix_final as number,
    auctionStatus: r.auction_status as WonRow["auctionStatus"],
    carStatus: r.car_status as string,
    paymentStatus: r.payment_status as WonRow["paymentStatus"],
    deliveryStatus: r.delivery_status as WonRow["deliveryStatus"],
    validatedAt: (r.validated_at as string) ?? null,
    paymentDeadline: (r.payment_deadline as string) ?? null,
    closedAt: (r.closed_at as string) ?? null,
    updatedAt: r.updated_at as string,
  }));
}

export interface WonAuctionDetail {
  id: string;
  status: string;
  currentPrice: number;
  startingPrice: number;
  startsAt: string;
  endsAt: string;
  closedAt: string | null;
  validatedAt: string | null;
  paymentDeadline: string | null;
  bidCount: number;
}

export interface WonCarDetail {
  id: string;
  marque: string;
  modele: string;
  annee: number;
  finition: string;
  kilometrage: number;
  transmission: string;
  carburant: string;
  couleurExterieur: string;
  couleurInterieur: string;
  puissanceFiscale: number;
  nombreCles: number;
  procuration: string;
  bodyType: string | null;
  noteExpert: number | null;
  status: string;
  paymentStatus: "non_paye" | "paye";
  deliveryStatus: "non_livre" | "livre";
  images: string[];
  expertImages: string[];
  vendeurNom: string;
}

export async function getMyWonCarDetails(auctionId: string): Promise<{ auction: WonAuctionDetail; car: WonCarDetail }> {
  const { data, error } = await supabase.rpc("get_my_won_car_details", { p_auction_id: auctionId } as never);
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as { auction: Record<string, unknown>; car: Record<string, unknown> };
  const a = row.auction;
  const c = row.car;
  return {
    auction: {
      id: a.id as string,
      status: a.status as string,
      currentPrice: a.current_price as number,
      startingPrice: a.starting_price as number,
      startsAt: a.starts_at as string,
      endsAt: a.ends_at as string,
      closedAt: (a.closed_at as string) ?? null,
      validatedAt: (a.validated_at as string) ?? null,
      paymentDeadline: (a.payment_deadline as string) ?? null,
      bidCount: a.bid_count as number,
    },
    car: {
      id: c.id as string,
      marque: c.marque as string,
      modele: c.modele as string,
      annee: c.annee as number,
      finition: (c.finition as string) ?? "",
      kilometrage: c.kilometrage as number,
      transmission: c.transmission as string,
      carburant: c.carburant as string,
      couleurExterieur: (c.couleur_exterieur as string) ?? "",
      couleurInterieur: (c.couleur_interieur as string) ?? "",
      puissanceFiscale: c.puissance_fiscale as number,
      nombreCles: c.nombre_cles as number,
      procuration: (c.procuration as string) ?? "",
      bodyType: (c.body_type as string) ?? null,
      noteExpert: (c.note_expert as number) ?? null,
      status: c.status as string,
      paymentStatus: c.payment_status as WonCarDetail["paymentStatus"],
      deliveryStatus: c.delivery_status as WonCarDetail["deliveryStatus"],
      images: Array.isArray(c.images) ? (c.images as string[]) : [],
      expertImages: Array.isArray(c.expert_images) ? (c.expert_images as string[]) : [],
      vendeurNom: (c.vendeur_nom as string) ?? "Vendeur",
    },
  };
}

export type { CarExpertise };
