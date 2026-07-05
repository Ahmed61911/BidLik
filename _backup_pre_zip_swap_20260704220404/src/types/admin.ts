/**
 * Admin domain types — mirror the backend admin contract.
 * Kept separate from public auction types for clarity.
 */

export type UserRole = "acheteur" | "vendeur" | "expert" | "admin";

export interface AdminUser {
  id: string;
  nom: string;
  email: string;
  telephone: string;
  role: UserRole;
  cautionDeposee: boolean;
  cautionMontant: number;
  inscritLe: string;
  actif: boolean;
}

export interface Expert {
  id: string;
  nom: string;
  email: string;
  ville: string;
  inspectionsEnCours: number;
  inspectionsTotal: number;
  noteMoyenne: number; // /10 average given
  actif: boolean;
}

export interface ExpertAssignment {
  id: string;
  carId: string;
  carLabel: string;        // e.g. "Mercedes Classe C 220d (2021)"
  expertId: string | null;
  expertNom: string | null;
  status: "non_assigne" | "en_inspection" | "rapport_recu";
  assigneLe: string | null;
  rapportRecuLe: string | null;
  noteFinale: number | null;
}

export type SubmissionStatus = "en_attente_admin" | "approuvee" | "rejetee";

export interface PendingSubmission {
  carId: string;
  carLabel: string;
  vendeurNom: string;
  marque: string;
  modele: string;
  annee: number;
  kilometrage: number;
  prixAttendu: number;
  soumisLe: string;
}

export interface PendingValidation {
  auctionId: string;
  carId: string;
  carLabel: string;
  vendeurNom: string;
  acheteurNom: string;
  prixFinal: number;
  prixAttendu: number;
  termineLe: string;
  raison: "ecart_prix" | "verification_paiement" | "litige" | "controle_qualite";
  /** ISO timestamp — 24h after closure, admin must validate/reject before this. */
  adminValidationDeadline: string | null;
}

export interface AdminStats {
  totalAuctions: number;
  liveAuctions: number;
  totalUsers: number;
  acheteursActifs: number;
  vendeursActifs: number;
  experts: number;
  ventesValideesMois: number;
  caMois: number; // commission revenue, MAD
  volumeMois: number; // GMV, MAD
  totalVentesValidees: number; // total GMV all-time, MAD
  totalVentesEncaissees: number; // total cashed-in payments, MAD
  tauxConversion: number; // 0..1
  enchersValidationsEnAttente: number;
}

export interface RevenuePoint {
  date: string;        // ISO
  ventes: number;      // count
  ca: number;          // MAD
}
