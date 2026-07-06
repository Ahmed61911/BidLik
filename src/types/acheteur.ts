/**
 * Acheteur (buyer) domain types.
 * Mirror future ASP.NET Core DTOs. Currency is always MAD.
 */

export type EnchereStatus = "active" | "gagnee" | "perdue" | "en_attente_validation";

export interface MonEnchere {
  auctionId: string;
  carId: string;
  marque: string;
  modele: string;
  annee: number;
  monMontant: number;          // last bid I placed
  prixActuel: number;          // current top bid on the auction
  prixPlancher: number;        // reference price (used for color tier)
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
  montant: number;             // positive = débit, négatif = crédit
  status: PaiementStatus;
  reference: string;
  auctionId?: string;
  proofUrl?: string;
  proofName?: string;
  notes?: string;
  paymentMethod?: string;
  bank?: string;
}

export type NotifType =
  | "outbid"           // surenchéri
  | "won"              // remporté
  | "lost"             // perdu
  | "ending_soon"      // se termine bientôt
  | "caution"          // caution validée / rejetée
  | "system";

export interface Notification {
  id: string;
  type: NotifType;
  titre: string;
  message: string;
  createdAt: string;
  read: boolean;
  auctionId?: string;
}
