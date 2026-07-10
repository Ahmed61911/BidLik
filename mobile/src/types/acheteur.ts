/**
 * Acheteur (buyer) domain types — ported from webapp/src/types/acheteur.ts.
 * Currency is always MAD.
 */

export type EnchereStatus = "active" | "gagnee" | "perdue" | "en_attente_validation";

export interface MonEnchere {
  auctionId: string;
  carId: string;
  marque: string;
  modele: string;
  annee: number;
  monMontant: number; // last bid I placed
  prixActuel: number; // current top bid on the auction
  prixPlancher: number; // reference price (used for color tier)
  jeSuisLeader: boolean;
  endsAt: string;
  status: EnchereStatus;
  bidCount: number;
}

export type PaiementStatus = "en_attente" | "regle" | "rembourse" | "rejete";
export type PaiementType = "achat" | "caution" | "commission" | "virement_vendeur" | "remboursement";

export interface Paiement {
  id: string;
  date: string;
  type: PaiementType;
  libelle: string;
  montant: number; // positive = débit, négatif = crédit
  status: PaiementStatus;
  reference: string;
  auctionId?: string;
  proofUrl?: string;
  proofName?: string;
  notes?: string;
  paymentMethod?: string;
  bank?: string;
}

/**
 * Notification types. `outbid`..`system` mirror the webapp's current backend
 * enum; the rest (`auction_starting`, `payment_approved`, `payment_rejected`,
 * `vehicle_ready`, `announcement`) require the backend additions described in
 * the architecture plan (§2) before they can actually be emitted server-side.
 */
export type NotifType =
  | "outbid" // surenchéri
  | "won" // remporté
  | "lost" // perdu
  | "ending_soon" // se termine bientôt
  | "caution" // caution validée / rejetée
  | "system"
  | "auction_starting"
  | "payment_approved"
  | "payment_rejected"
  | "vehicle_ready"
  | "announcement";

export interface Notification {
  id: string;
  type: NotifType;
  titre: string;
  message: string;
  createdAt: string;
  read: boolean;
  auctionId?: string;
}
