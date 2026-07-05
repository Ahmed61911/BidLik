/**
 * Expert domain types — mirror the backend contract.
 * Experts inspect cars, fill a structured report, and submit a /10 note.
 */

export type InspectionStage = "en_inspection" | "rapport_recu";

export interface InspectionChecklist {
  carrosserie: number;       // /10
  moteur: number;            // /10
  interieur: number;         // /10
  pneus: number;             // /10
  electronique: number;      // /10
  documents: boolean;
}

/**
 * Vehicle fields the expert verifies during inspection — exactly the set
 * admin's car form locks after an expert report is received (see
 * EXPERT_LOCKED_FIELDS in src/routes/admin.voitures.tsx), so this is the
 * one place both the source-of-truth and the read-only admin view agree on.
 */
export interface CarDetailsEdit {
  marque: string;
  modele: string;
  annee: number;
  kilometrage: number;
  bodyType: string;
  transmission: string;
  carburant: string;
  couleurExterieur: string;
  couleurInterieur: string;
}

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
  /** Current real vehicle data — pre-fills the inspection form; also what gets displayed for a past report. */
  carDetails: CarDetailsEdit;
  /** Only set once a report has been submitted (stage === "rapport_recu"). */
  checklist: InspectionChecklist | null;
  commentaire: string | null;
  images: string[];            // expertise photos (storage paths)
  commercialImages: string[];  // buyer-facing photos (storage paths)
  rapportPath: string | null;
  rapportName: string | null;
}

export interface ExpertReport {
  inspectionId: string;
  checklist: InspectionChecklist;
  noteFinale: number;        // /10 (typically computed from checklist)
  commentaire: string;
  carDetails?: CarDetailsEdit;
  detailsConfirmes?: boolean;
  images?: string[];         // storage paths of uploaded inspection photos
  commercialImages?: string[]; // storage paths of uploaded buyer-facing photos
  rapportPdfNom?: string | null;
  rapportPath?: string | null; // storage path of the uploaded report PDF
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
