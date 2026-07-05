/**
 * Expert domain types — mirror the backend contract.
 * Experts inspect cars, fill a structured report, and submit a /10 note.
 */

export type InspectionStage = "en_inspection" | "rapport_recu";

export interface ExpertInspection {
  id: string;             // assignment id
  carId: string;
  carLabel: string;
  marque: string;
  modele: string;
  annee: number;
  kilometrage: number;
  vendeurNom: string;
  ville: string;
  assigneLe: string;
  echeance: string;       // due date
  stage: InspectionStage;
  noteFinale: number | null;
  rapportRecuLe: string | null;
}

export interface InspectionChecklist {
  carrosserie: number;       // /10
  moteur: number;            // /10
  interieur: number;         // /10
  pneus: number;             // /10
  electronique: number;      // /10
  documents: boolean;
}

export interface CarDetailsEdit {
  marque: string;
  modele: string;
  annee: number;
  kilometrage: number;
  bodyType: string;
  carburant: string;
  transmission: string;
  couleur: string;
}

export interface ExpertReport {
  inspectionId: string;
  checklist: InspectionChecklist;
  noteFinale: number;        // /10 (typically computed from checklist)
  commentaire: string;
  carDetails?: CarDetailsEdit;
  detailsConfirmes?: boolean;
  images?: string[];         // data URLs of uploaded photos
  rapportPdfNom?: string | null;
  rapportPdfDataUrl?: string | null;
}

/** Full expertise info displayed on the public auction page. */
export interface CarExpertise {
  noteFinale: number | null;
  commentaire: string | null;
  checklist: InspectionChecklist | null;
  rapportUrl: string | null;
  rapportName: string | null;
  rapportRecuLe: string | null;
  /** Only populated for admins and buyers (acheteurs) — otherwise null. */
  expertImages: string[] | null;
}

export interface ExpertStats {
  enCours: number;
  rapportsCeMois: number;
  noteMoyenneDonnee: number;
  prochaineEcheance: string | null;
}
