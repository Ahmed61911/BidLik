/**
 * Vendeur (seller) domain types — mirror the backend contract.
 * The seller submits cars, tracks inspections, follows live auctions,
 * sees finalized sales, and tracks payouts.
 */

import type { Car, CarStatus, PaymentStatus, DeliveryStatus } from "./auction";

export type SellerCarStage =
  | "brouillon"            // submitted, awaiting expert assignment
  | "en_inspection"        // expert assigned, inspecting
  | "rapport_recu"         // inspection report received, awaiting auction
  | "en_enchere"           // currently live in auction
  | "en_attente_validation"
  | "vendu"                // validated sale
  | "annulee";             // cancelled

export interface SellerCar {
  id: string;
  marque: string;
  modele: string;
  annee: number;
  kilometrage: number;
  prixAttendu: number;
  noteExpert: number | null;
  stage: SellerCarStage;
  soumisLe: string;
  expertNom: string | null;
  // when in/after auction:
  prixCourant: number | null;
  bidCount: number | null;
  prixFinal: number | null;
  acheteurNom: string | null;
  paymentStatus: PaymentStatus | null;
  deliveryStatus: DeliveryStatus | null;
  // raw underlying car status (mirrors backend Car.status)
  carStatus: CarStatus;
  // linked auction id (when stage in {en_enchere, en_attente_validation, vendu})
  auctionId: string | null;
}

export interface SellerStats {
  voituresActives: number;
  enInspection: number;
  enEnchereLive: number;
  ventesValideesMois: number;
  caBrutMois: number;          // gross MAD
  commissionMois: number;      // commission MAD
  caNetMois: number;           // net to seller MAD
  prochainPaiement: string | null; // ISO date
  prochainPaiementMontant: number;
}

export interface SellerPayout {
  id: string;
  carId: string;
  carLabel: string;
  prixFinal: number;
  commission: number;
  net: number;
  status: "en_attente" | "vire" | "annule";
  date: string;
}

export interface SellerSubmitCarInput {
  marque: string;
  modele: string;
  finition: string;
  annee: number;
  kilometrage: number;
  carburant: Car["carburant"];
  transmission: Car["transmission"];
  couleurExterieur: string;
  couleurInterieur: string;
  puissanceFiscale: number;
  nombreCles: number;
  prixAttendu: number;
}
