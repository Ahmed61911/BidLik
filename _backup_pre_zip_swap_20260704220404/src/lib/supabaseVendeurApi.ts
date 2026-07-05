/**
 * Real seller API backed by Supabase.
 * Scoped to the authenticated user (vendeur_id = auth.uid()).
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  SellerCar,
  SellerCarStage,
  SellerPayout,
  SellerStats,
  SellerSubmitCarInput,
} from "@/types/vendeur";
import type { CarStatus, PaymentStatus, DeliveryStatus } from "@/types/auction";

const COMMISSION_RATE = 0.05;

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Non authentifié");
  return data.user.id;
}

async function currentUserName(uid: string): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("nom")
    .eq("user_id", uid)
    .maybeSingle();
  return data?.nom?.trim() || "Vendeur";
}

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toISOString().slice(0, 10);
}

type CarRow = {
  id: string;
  marque: string;
  modele: string;
  annee: number;
  kilometrage: number;
  prix_attendu: number;
  note_expert: number | null;
  status: CarStatus;
  payment_status: PaymentStatus;
  delivery_status: DeliveryStatus;
  created_at: string;
};

type AuctionRow = {
  id: string;
  car_id: string;
  status: string;
  current_price: number;
  bid_count: number;
  top_bidder_id: string | null;
};

type AssignmentRow = {
  car_id: string;
  status: string;
  expert_id: string | null;
};

function deriveStage(
  car: CarRow,
  auction: AuctionRow | undefined,
  assignment: AssignmentRow | undefined,
): SellerCarStage {
  if (car.status === "vendu_validee") return "vendu";
  if (car.status === "vendu_annulee") return "annulee";
  if (auction) {
    if (auction.status === "validated") return "vendu";
    if (auction.status === "cancelled") return "annulee";
    if (auction.status === "closed") return "en_attente_validation";
    return "en_enchere"; // scheduled or live
  }
  if (assignment) {
    if (assignment.status === "rapport_recu") return "rapport_recu";
    if (assignment.status === "en_inspection") return "en_inspection";
  }
  return "brouillon";
}

async function fetchMyCars(uid: string): Promise<SellerCar[]> {
  // Cars: use SECURITY DEFINER RPC — sensitive fields (payment_status, delivery_status)
  // are not directly readable by authenticated users. RPC filters to auth.uid()'s cars.
  const { data: carsRaw, error } = await supabase.rpc("list_my_seller_cars");
  if (error) throw error;
  const rows = ((carsRaw ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    marque: r.marque as string,
    modele: r.modele as string,
    annee: r.annee as number,
    kilometrage: r.kilometrage as number,
    prix_attendu: r.prix_attendu as number,
    note_expert: (r.note_expert as number | null) ?? null,
    status: r.status as CarStatus,
    payment_status: r.payment_status as PaymentStatus,
    delivery_status: r.delivery_status as DeliveryStatus,
    created_at: r.created_at as string,
  })) as CarRow[];
  if (rows.length === 0) return [];
  const carIds = rows.map((c) => c.id);

  // Auctions for own cars: use SECURITY DEFINER RPC — top_bidder_id is not readable directly.
  const { data: rawAuctions, error: auctionsErr } = await supabase.rpc("seller_list_my_car_auctions");
  const assignmentsRes = await supabase
    .from("expert_assignments")
    .select("car_id, status, expert_id")
    .in("car_id", carIds);
  if (auctionsErr) throw auctionsErr;
  if (assignmentsRes.error) throw assignmentsRes.error;

  const auctionMap = new Map<string, AuctionRow>();
  ((rawAuctions ?? []) as AuctionRow[]).filter((a) => carIds.includes(a.car_id)).forEach((a) => auctionMap.set(a.car_id, a));
  const assignMap = new Map<string, AssignmentRow>();
  ((assignmentsRes.data ?? []) as AssignmentRow[]).forEach((a) => assignMap.set(a.car_id, a));

  // Resolve expert + buyer names
  const expertIds = Array.from(
    new Set(
      Array.from(assignMap.values())
        .map((a) => a.expert_id)
        .filter((v): v is string => !!v),
    ),
  );
  const buyerIds = Array.from(
    new Set(
      Array.from(auctionMap.values())
        .map((a) => a.top_bidder_id)
        .filter((v): v is string => !!v),
    ),
  );
  const allProfileIds = Array.from(new Set([...expertIds, ...buyerIds]));
  const nameMap = new Map<string, string>();
  if (allProfileIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, nom")
      .in("user_id", allProfileIds);
    (profs ?? []).forEach((p) => nameMap.set(p.user_id, p.nom ?? ""));
  }

  return rows.map((c) => {
    const auction = auctionMap.get(c.id);
    const assignment = assignMap.get(c.id);
    const stage = deriveStage(c, auction, assignment);
    return {
      id: c.id,
      marque: c.marque,
      modele: c.modele,
      annee: c.annee,
      kilometrage: c.kilometrage,
      prixAttendu: c.prix_attendu,
      noteExpert: c.note_expert,
      stage,
      soumisLe: fmtDate(c.created_at),
      expertNom: assignment?.expert_id ? nameMap.get(assignment.expert_id) ?? null : null,
      prixCourant: auction?.current_price ?? null,
      bidCount: auction?.bid_count ?? null,
      prixFinal: auction && ["closed", "validated", "cancelled"].includes(auction.status)
        ? auction.current_price
        : null,
      acheteurNom: auction?.top_bidder_id ? nameMap.get(auction.top_bidder_id) ?? null : null,
      paymentStatus: stage === "vendu" || stage === "en_attente_validation" ? c.payment_status : null,
      deliveryStatus: stage === "vendu" || stage === "en_attente_validation" ? c.delivery_status : null,
      carStatus: c.status,
      auctionId: auction?.id ?? null,
    } satisfies SellerCar;
  });
}

function newCarId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `c-${ts}-${rand}`;
}

export const supabaseVendeurApi = {
  async listCars(): Promise<SellerCar[]> {
    const uid = await currentUserId();
    return fetchMyCars(uid);
  },

  async getStats(): Promise<SellerStats> {
    const uid = await currentUserId();
    const cars = await fetchMyCars(uid);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const venduMois = cars.filter(
      (c) => c.stage === "vendu" && c.soumisLe && new Date(c.soumisLe) >= monthStart,
    );
    // CA brut = sum of final prices of validated sales this month
    const caBrutMois = venduMois.reduce((s, c) => s + (c.prixFinal ?? 0), 0);
    const commissionMois = Math.round(caBrutMois * COMMISSION_RATE);
    const caNetMois = caBrutMois - commissionMois;

    const enAttentePayouts = cars.filter(
      (c) => c.stage === "vendu" && c.paymentStatus !== "paye",
    );
    const prochain = enAttentePayouts[0];

    return {
      voituresActives: cars.filter((c) => c.stage !== "annulee").length,
      enInspection: cars.filter((c) => c.stage === "en_inspection").length,
      enEnchereLive: cars.filter((c) => c.stage === "en_enchere").length,
      ventesValideesMois: venduMois.length,
      caBrutMois,
      commissionMois,
      caNetMois,
      prochainPaiement: prochain?.soumisLe ?? null,
      prochainPaiementMontant: prochain
        ? Math.round((prochain.prixFinal ?? 0) * (1 - COMMISSION_RATE))
        : 0,
    };
  },

  async submitCar(input: SellerSubmitCarInput): Promise<SellerCar> {
    const uid = await currentUserId();
    const nom = await currentUserName(uid);
    const id = newCarId();
    const { error } = await supabase.from("cars").insert({
      id,
      vendeur_id: uid,
      vendeur_nom: nom,
      type: "particulier",
      marque: input.marque,
      modele: input.modele,
      finition: input.finition || "",
      annee: input.annee,
      kilometrage: input.kilometrage,
      carburant: input.carburant,
      transmission: input.transmission,
      couleur_exterieur: input.couleurExterieur || "",
      couleur_interieur: input.couleurInterieur || "",
      puissance_fiscale: input.puissanceFiscale || 8,
      nombre_cles: input.nombreCles || 2,
      prix_attendu: input.prixAttendu,
      status: "open",
      images: [],
    });
    if (error) throw error;
    // Trigger ensure_expert_assignment creates the assignment row automatically.
    const cars = await fetchMyCars(uid);
    const created = cars.find((c) => c.id === id);
    if (!created) throw new Error("Voiture introuvable après création");
    return created;
  },

  async cancelCar(id: string): Promise<void> {
    const uid = await currentUserId();
    // Only allowed at brouillon/en_inspection stages — no auction exists yet.
    const { data: auction } = await supabase
      .from("auctions")
      .select("id")
      .eq("car_id", id)
      .maybeSingle();
    if (auction) throw new Error("Impossible d'annuler : une enchère existe déjà");
    // Remove any expert assignment first, then delete the car.
    await supabase.from("expert_assignments").delete().eq("car_id", id);
    const { error } = await supabase.from("cars").delete().eq("id", id).eq("vendeur_id", uid);
    if (error) throw error;
  },

  async listPayouts(): Promise<SellerPayout[]> {
    const uid = await currentUserId();
    // Read admin-recorded payments for this seller (virement_vendeur primarily).
    const { data: rows, error } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", uid)
      .in("type", ["virement_vendeur", "commission"])
      .order("created_at", { ascending: false });
    if (error) throw error;
    const payments = (rows ?? []) as Array<Record<string, unknown>>;
    const carIds = Array.from(new Set(payments.map((r) => r.car_id as string | null).filter(Boolean) as string[]));
    const carMap = new Map<string, { marque: string; modele: string; annee: number }>();
    if (carIds.length > 0) {
      const { data: cars } = await supabase
        .from("cars")
        .select("id, marque, modele, annee")
        .in("id", carIds);
      (cars ?? []).forEach((c) =>
        carMap.set(c.id as string, { marque: c.marque as string, modele: c.modele as string, annee: c.annee as number }),
      );
    }
    // group by car_id so commission row is netted from the seller transfer
    const byCar = new Map<string, { net: number; commission: number; date: string; status: SellerPayout["status"]; proofUrl?: string; proofName?: string; reference?: string }>();
    for (const r of payments) {
      const carId = (r.car_id as string) ?? "_none_";
      const cur = byCar.get(carId) ?? { net: 0, commission: 0, date: (r.paid_at as string) ?? (r.created_at as string), status: "en_attente" as const };
      const amount = r.amount as number;
      if (r.type === "virement_vendeur") {
        cur.net = amount;
        cur.status = r.status === "paye" ? "vire" : r.status === "annule" ? "annule" : "en_attente";
        cur.date = (r.paid_at as string) ?? (r.created_at as string);
        cur.proofUrl = (r.proof_url as string) ?? undefined;
        cur.proofName = (r.proof_name as string) ?? undefined;
        cur.reference = (r.reference as string) ?? undefined;
      } else if (r.type === "commission") {
        cur.commission = amount;
      }
      byCar.set(carId, cur);
    }
    return Array.from(byCar.entries()).map(([carId, v]) => {
      const car = carMap.get(carId);
      const prixFinal = v.net + v.commission;
      return {
        id: `pay-${carId}`,
        carId,
        carLabel: car ? `${car.marque} ${car.modele} (${car.annee})` : carId,
        prixFinal,
        commission: v.commission,
        net: v.net,
        status: v.status,
        date: v.date.slice(0, 10),
      } satisfies SellerPayout;
    });
  },
};
