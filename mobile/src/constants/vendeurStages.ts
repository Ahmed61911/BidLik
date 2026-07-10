import type { SellerCarStage } from "@/types";
import type { StatusTone } from "@/components/ui/StatusBadge";

/** Ported from webapp/src/routes/vendeur.index.tsx STAGE_LABEL/STAGE_TONE. */
export const STAGE_LABEL: Record<SellerCarStage, string> = {
  brouillon: "À assigner",
  en_inspection: "En inspection",
  rapport_recu: "Rapport reçu",
  en_enchere: "En enchère",
  en_attente_validation: "Attente validation",
  vendu: "Vendue",
  annulee: "Annulée",
};

export const STAGE_TONE: Record<SellerCarStage, StatusTone> = {
  brouillon: "muted",
  en_inspection: "amber",
  rapport_recu: "amber",
  en_enchere: "emerald",
  en_attente_validation: "amber",
  vendu: "emerald",
  annulee: "destructive",
};
