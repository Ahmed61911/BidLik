/**
 * Real expert API backed by Supabase.
 * Inspections = expert_assignments rows assigned to the logged-in expert
 * joined with cars + vendor profiles.
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  ExpertInspection,
  ExpertReport,
  ExpertStats,
  InspectionChecklist,
} from "@/types/expert";

const DEADLINE_DAYS = 7;

function fmtDate(d: string | Date | null): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toISOString().slice(0, 10);
}

function addDays(iso: string | null, days: number): string {
  const base = iso ? new Date(iso) : new Date();
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

async function currentExpertId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Non authentifié");
  return data.user.id;
}

type RawAssignment = {
  id: string;
  car_id: string;
  expert_id: string | null;
  status: string;
  assigne_le: string | null;
  rapport_recu_le: string | null;
  note_finale: number | null;
  commentaire: string | null;
  checklist: InspectionChecklist | null;
  rapport_url: string | null;
  rapport_name: string | null;
};

async function fetchInspections(expertId: string): Promise<ExpertInspection[]> {
  const { data: rows, error } = await supabase
    .from("expert_assignments")
    .select("*")
    .eq("expert_id", expertId)
    .order("assigne_le", { ascending: false, nullsFirst: false });
  if (error) throw error;
  const assignments = (rows ?? []) as RawAssignment[];
  if (assignments.length === 0) return [];

  const carIds = Array.from(new Set(assignments.map((a) => a.car_id)));
  // Use SECURITY DEFINER RPC — vendeur_id/expert_images aren't directly
  // readable by authenticated users (see 20260705120000 migration).
  const { data: cars, error: cErr } = await supabase.rpc("expert_list_car_details", { p_ids: carIds });
  if (cErr) throw cErr;
  const carRows = (cars ?? []) as Array<{
    id: string; marque: string; modele: string; annee: number; kilometrage: number;
    vendeur_id: string | null; vendeur_nom: string | null;
    body_type: string | null; transmission: string | null; carburant: string | null;
    couleur_exterieur: string | null; couleur_interieur: string | null;
    images: unknown; expert_images: unknown;
  }>;
  const carMap = new Map(carRows.map((c) => [c.id, c]));

  const vendorIds = Array.from(
    new Set(carRows.map((c) => c.vendeur_id).filter((v): v is string => !!v)),
  );
  const villeByVendor = new Map<string, string>();
  if (vendorIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, ville")
      .in("user_id", vendorIds);
    (profs ?? []).forEach((p) => villeByVendor.set(p.user_id, p.ville ?? ""));
  }

  return assignments.map((a) => {
    const car = carMap.get(a.car_id);
    const stage = a.status === "rapport_recu" ? "rapport_recu" : "en_inspection";
    const images = Array.isArray(car?.images) ? (car.images as string[]) : [];
    const expertImages = Array.isArray(car?.expert_images) ? (car.expert_images as string[]) : [];
    return {
      id: a.id,
      carId: a.car_id,
      carLabel: car ? `${car.marque} ${car.modele} (${car.annee})` : a.car_id,
      marque: car?.marque ?? "",
      modele: car?.modele ?? "",
      annee: car?.annee ?? 0,
      kilometrage: car?.kilometrage ?? 0,
      vendeurNom: car?.vendeur_nom ?? "—",
      ville: (car?.vendeur_id && villeByVendor.get(car.vendeur_id)) || "—",
      assigneLe: fmtDate(a.assigne_le),
      echeance: addDays(a.assigne_le, DEADLINE_DAYS),
      stage,
      noteFinale: a.note_finale,
      rapportRecuLe: a.rapport_recu_le ? fmtDate(a.rapport_recu_le) : null,
      carDetails: {
        marque: car?.marque ?? "",
        modele: car?.modele ?? "",
        annee: car?.annee ?? 0,
        kilometrage: car?.kilometrage ?? 0,
        bodyType: car?.body_type ?? "",
        transmission: car?.transmission ?? "manuelle",
        carburant: car?.carburant ?? "essence",
        couleurExterieur: car?.couleur_exterieur ?? "",
        couleurInterieur: car?.couleur_interieur ?? "",
      },
      checklist: a.checklist,
      commentaire: a.commentaire,
      images: expertImages,
      commercialImages: images,
      rapportPath: a.rapport_url,
      rapportName: a.rapport_name,
    } satisfies ExpertInspection;
  });
}

export const supabaseExpertApi = {
  async getStats(): Promise<ExpertStats> {
    const expertId = await currentExpertId();
    const items = await fetchInspections(expertId);
    const enCours = items.filter((i) => i.stage === "en_inspection");
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const reportsMonth = items.filter(
      (i) => i.stage === "rapport_recu" && i.rapportRecuLe && new Date(i.rapportRecuLe) >= monthStart,
    );
    const allReports = items.filter((i) => i.stage === "rapport_recu" && i.noteFinale != null);
    const avg =
      allReports.length === 0
        ? 0
        : allReports.reduce((s, i) => s + (i.noteFinale ?? 0), 0) / allReports.length;
    const prochaine = enCours.map((i) => i.echeance).sort()[0] ?? null;
    return {
      enCours: enCours.length,
      rapportsCeMois: reportsMonth.length,
      noteMoyenneDonnee: Number(avg.toFixed(1)),
      prochaineEcheance: prochaine,
    };
  },

  async listInspections(): Promise<ExpertInspection[]> {
    const expertId = await currentExpertId();
    return fetchInspections(expertId);
  },

  async getInspection(id: string): Promise<ExpertInspection> {
    const expertId = await currentExpertId();
    const all = await fetchInspections(expertId);
    const found = all.find((i) => i.id === id);
    if (!found) throw new Error("Inspection introuvable");
    return found;
  },

  computeNote(c: InspectionChecklist): number {
    const avg = (c.carrosserie + c.moteur + c.interieur + c.pneus + c.electronique) / 5;
    const docsBonus = c.documents ? 0 : -0.5;
    return Math.max(0, Math.min(10, Number((avg + docsBonus).toFixed(1))));
  },

  async submitReport(report: ExpertReport): Promise<void> {
    // 1. Look up assignment to get car_id
    const { data: assignment, error: aErr } = await supabase
      .from("expert_assignments")
      .select("car_id")
      .eq("id", report.inspectionId)
      .maybeSingle();
    if (aErr) throw aErr;
    if (!assignment) throw new Error("Inspection introuvable");
    const carId = assignment.car_id;

    // 2. Optionally update car details when expert confirmed them.
    // These are exactly the 9 fields admin's car form locks after a report
    // is received (EXPERT_LOCKED_FIELDS in admin.voitures.tsx) — this RPC
    // write is the source of truth for all of them, not just a subset.
    if (report.carDetails && report.detailsConfirmes) {
      const d = report.carDetails;
      const updates = {
        marque: d.marque,
        modele: d.modele,
        annee: d.annee,
        kilometrage: d.kilometrage,
        body_type: d.bodyType,
        transmission: d.transmission,
        carburant: d.carburant,
        couleur_exterieur: d.couleurExterieur,
        couleur_interieur: d.couleurInterieur,
      };
      const { error: uErr } = await supabase.from("cars").update(updates as never).eq("id", carId);
      if (uErr) throw uErr;
    }


    // 3. Append expert-only inspection photos (kept separate from seller images).
    // These are storage paths (src/lib/storage), not binary data — the file
    // itself already landed on disk during upload, this just records where.
    if (report.images && report.images.length > 0) {
      const { data: car } = await supabase
        .from("cars")
        .select("expert_images")
        .eq("id", carId)
        .maybeSingle();
      const raw = (car as { expert_images?: unknown } | null)?.expert_images;
      const existing = Array.isArray(raw) ? (raw as string[]) : [];
      const merged = [...existing, ...report.images].slice(0, 24);
      const { error: eiErr } = await supabase
        .from("cars")
        .update({ expert_images: merged } as never)
        .eq("id", carId);
      if (eiErr) throw eiErr;
    }

    // 3b. Buyer-facing commercial photos, uploaded by the expert.
    if (report.commercialImages && report.commercialImages.length > 0) {
      const { error: ciErr } = await supabase
        .from("cars")
        .update({ images: report.commercialImages } as never)
        .eq("id", carId);
      if (ciErr) throw ciErr;
    }

    // 4. Submit the final note + report metadata via RPC. p_rapport_url now
    // holds a storage path, not a base64 data URL.
    const note = Math.round(Math.max(0, Math.min(10, report.noteFinale)));
    const { error: rErr } = await supabase.rpc("submit_expert_report", {
      p_car_id: carId,
      p_note: note,
      p_commentaire: report.commentaire ?? null,
      p_checklist: (report.checklist as unknown as Record<string, unknown>) ?? null,
      p_rapport_url: report.rapportPath ?? null,
      p_rapport_name: report.rapportPdfNom ?? null,
    } as never);
    if (rErr) throw rErr;
  },
};
