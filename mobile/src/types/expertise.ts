/**
 * Buyer-facing expertise report types — trimmed from webapp/src/types/expert.ts.
 * Mobile only *displays* expertise reports (buyers/sellers); it never authors one
 * (that stays an expert/admin-only webapp flow).
 */

export interface InspectionChecklist {
  carrosserie: number; // /10
  moteur: number; // /10
  interieur: number; // /10
  pneus: number; // /10
  electronique: number; // /10
  documents: boolean;
}

/** Full expertise info displayed on the auction/vehicle detail screen. */
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
