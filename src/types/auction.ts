/**
 * Domain types — mirror the backend contract.
 * Keep aligned with the ASP.NET Core API DTOs.
 */

export type CarStatus = "open" | "en_cours" | "en_attente_validation" | "expertise" | "vendu_validee" | "vendu_annulee";
export type PaymentStatus = "non_paye" | "paye";
export type DeliveryStatus = "non_livre" | "livre";
export type CarType = "loueur" | "entreprise" | "particulier";
export type Procuration = "procuration" | "carton_ouvert" | "carton_ferme";
export type Transmission = "manuelle" | "automatique";
export type Carburant = "essence" | "diesel" | "essence_hybride" | "diesel_hybride" | "hybride" | "electrique";

export const BODY_TYPES = [
  "Berline",
  "SUV",
  "Compact",
  "Citadine",
  "Routière",
  "Break",
  "Coupé",
  "Cabriolet",
  "Monospace",
  "Pick-up",
  "Utilitaire",
  "4x4",
] as const;
export type BodyType = typeof BODY_TYPES[number];

export interface Car {
  id: string;
  vendeurId: string;
  vendeurNom: string;
  type: CarType;
  /** Carrosserie : Berline, SUV, Compact, etc. */
  bodyType?: BodyType | string | null;
  marque: string;
  modele: string;
  finition: string;
  transmission: Transmission;
  carburant: Carburant;
  annee: number;
  kilometrage: number;
  couleurExterieur: string;
  couleurInterieur: string;
  noteExpert: number | null;        // /10
  nombreCles: number;
  opposition: boolean;
  mainLevee: boolean;
  puissanceFiscale: number;
  carteGriseBarree: boolean;
  procuration: Procuration;
  dateVente: string | null;
  status: CarStatus;
  paymentStatus: PaymentStatus;
  deliveryStatus: DeliveryStatus;
  prixAttendu: number;              // seller's expected price (server-only, drives gradient)
  /** Prix plancher fixé par l'admin (information interne). */
  prixPlancher?: number | null;
  /** Prix minimum acceptable (information interne). */
  prixMinimum?: number | null;
  /** Sealed-bid only: minimum offer required (strictly greater). Server-validated. */
  minimumAcceptedPrice?: number;
  images: string[];
  /** Photos submitted by the expert during inspection (admin-only view). */
  expertImages?: string[];
}

/**
 * Auction format:
 *  - "ouverte" → enchère ouverte classique (live bidding visible)
 *  - "fermee"  → enchère à enveloppe fermée (sealed-bid, hidden offers)
 */
export type AuctionType = "ouverte" | "fermee";

/** Sealed-bid offer (enveloppe fermée). */
export type OfferStatus = "active" | "winning" | "rejected";
export interface Offer {
  id: string;
  carId: string;
  auctionId: string;
  userId: string;
  userName: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
  status: OfferStatus;
}

export interface Bid {
  id: string;
  auctionId: string;
  carId: string;
  bidderId: string;
  bidderName: string;               // anonymized display name
  amount: number;
  createdAt: string;
  isAuto: boolean;
}

export type AuctionStatus = "scheduled" | "live" | "closed" | "validated" | "cancelled";
export type AuctionVisibility = "ouvert" | "ferme";

export interface Auction {
  id: string;
  car: Car;
  startsAt: string;
  endsAt: string;
  currentPrice: number;             // current highest bid OR starting price
  startingPrice: number;
  bidCount: number;
  status: AuctionStatus;
  visibility: AuctionVisibility;    // "ouvert" = public, "ferme" = invite-only
  topBidderId: string | null;
  /** "ouverte" (live bidding) or "fermee" (sealed-bid / enveloppe fermée). */
  auctionType: AuctionType;
  /** Optional event grouping — multiple car lots share one event window. */
  eventId?: string | null;
}

/**
 * AuctionEvent — groups multiple car lots into a single 24h sale window.
 * Each car lot keeps its own independent bidding (prix, historique, realtime).
 */
export interface AuctionEvent {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: AuctionStatus;
  visibility: AuctionVisibility;
  lotIds: string[];                 // ids of the Auction (per-car) records in this event
}
