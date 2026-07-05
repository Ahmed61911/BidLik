/**
 * Admin-side API backed by Supabase.
 * Mirrors the shape of mockAdminApi so the existing admin pages keep working.
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  AdminStats,
  AdminUser,
  Expert,
  ExpertAssignment,
  PendingValidation,
  RevenuePoint,
  UserRole,
} from "@/types/admin";
import type { Auction, AuctionEvent, Car } from "@/types/auction";


const COMMISSION_RATE = 0.05;

/* ──────────────────────────── helpers ──────────────────────────── */

function startOfMonthISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

type CarRow = {
  id: string;
  vendeur_id: string | null;
  vendeur_nom: string;
  type: Car["type"];
  body_type: string | null;
  marque: string;
  modele: string;
  finition: string;
  transmission: Car["transmission"];
  carburant: Car["carburant"];
  annee: number;
  kilometrage: number;
  couleur_exterieur: string;
  couleur_interieur: string;
  note_expert: number | null;
  nombre_cles: number;
  opposition: boolean;
  main_levee: boolean;
  puissance_fiscale: number;
  carte_grise_barree: boolean;
  procuration: Car["procuration"];
  date_vente: string | null;
  status: Car["status"];
  payment_status: Car["paymentStatus"];
  delivery_status: Car["deliveryStatus"];
  prix_attendu: number;
  prix_plancher: number | null;
  prix_minimum: number | null;
  minimum_accepted_price: number | null;
  images: string[] | null;
};

function mapCar(row: CarRow): Car {
  return {
    id: row.id,
    vendeurId: row.vendeur_id ?? "",
    vendeurNom: row.vendeur_nom || "Vendeur",
    type: row.type,
    bodyType: row.body_type ?? null,
    marque: row.marque,
    modele: row.modele,
    finition: row.finition,
    transmission: row.transmission,
    carburant: row.carburant,
    annee: row.annee,
    kilometrage: row.kilometrage,
    couleurExterieur: row.couleur_exterieur,
    couleurInterieur: row.couleur_interieur,
    noteExpert: row.note_expert,
    nombreCles: row.nombre_cles,
    opposition: row.opposition,
    mainLevee: row.main_levee,
    puissanceFiscale: row.puissance_fiscale,
    carteGriseBarree: row.carte_grise_barree,
    procuration: row.procuration,
    dateVente: row.date_vente,
    status: row.status,
    paymentStatus: row.payment_status,
    deliveryStatus: row.delivery_status,
    prixAttendu: row.prix_attendu,
    prixPlancher: row.prix_plancher ?? null,
    prixMinimum: row.prix_minimum ?? null,
    minimumAcceptedPrice: row.minimum_accepted_price ?? undefined,
    images: Array.isArray(row.images) ? (row.images as string[]) : [],
    expertImages: Array.isArray((row as unknown as { expert_images?: unknown }).expert_images)
      ? ((row as unknown as { expert_images: string[] }).expert_images)
      : [],
  };
}

function carPatchToRow(p: Partial<Car>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (p.vendeurId !== undefined) out.vendeur_id = p.vendeurId || null;
  if (p.vendeurNom !== undefined) out.vendeur_nom = p.vendeurNom;
  if (p.type !== undefined) out.type = p.type;
  if (p.bodyType !== undefined) out.body_type = p.bodyType || null;
  if (p.marque !== undefined) out.marque = p.marque;
  if (p.modele !== undefined) out.modele = p.modele;
  if (p.finition !== undefined) out.finition = p.finition;
  if (p.transmission !== undefined) out.transmission = p.transmission;
  if (p.carburant !== undefined) out.carburant = p.carburant;
  if (p.annee !== undefined) out.annee = p.annee;
  if (p.kilometrage !== undefined) out.kilometrage = p.kilometrage;
  if (p.couleurExterieur !== undefined) out.couleur_exterieur = p.couleurExterieur;
  if (p.couleurInterieur !== undefined) out.couleur_interieur = p.couleurInterieur;
  if (p.nombreCles !== undefined) out.nombre_cles = p.nombreCles;
  if (p.opposition !== undefined) out.opposition = p.opposition;
  if (p.mainLevee !== undefined) out.main_levee = p.mainLevee;
  if (p.puissanceFiscale !== undefined) out.puissance_fiscale = p.puissanceFiscale;
  if (p.carteGriseBarree !== undefined) out.carte_grise_barree = p.carteGriseBarree;
  if (p.procuration !== undefined) out.procuration = p.procuration;
  if (p.prixAttendu !== undefined) out.prix_attendu = p.prixAttendu;
  if (p.prixPlancher !== undefined) out.prix_plancher = p.prixPlancher ?? null;
  if (p.prixMinimum !== undefined) out.prix_minimum = p.prixMinimum ?? null;
  if (p.minimumAcceptedPrice !== undefined) out.minimum_accepted_price = p.minimumAcceptedPrice;
  if (p.status !== undefined) out.status = p.status;
  return out;
}

function nextCarId(existing: string[]): string {
  const max = existing.reduce((m, id) => {
    const n = parseInt(id, 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 100);
  return String(max + 1).padStart(5, "0");
}

/* ──────────────────────────── analytics ──────────────────────────── */

async function getStats(): Promise<AdminStats> {
  const monthStart = startOfMonthISO();

  const [statsRes, rolesRes, paidPaymentsRes] = await Promise.all([
    supabase.rpc("admin_auction_stats", { p_since: monthStart }),
    supabase.from("user_roles").select("role, user_id"),
    supabase.from("payments").select("amount").eq("status", "paye"),
  ]);
  if (statsRes.error) throw new Error(statsRes.error.message);
  const s = (statsRes.data as Array<{
    total_auctions: number; live_auctions: number; pending_validations: number;
    validated_month_count: number; validated_month_volume: number;
    closed_month_total: number; closed_month_with_bids: number;
    total_validated_volume: number;
  }>)?.[0];

  const volumeMois = Number(s?.validated_month_volume ?? 0);
  const caMois = Math.round(volumeMois * COMMISSION_RATE);
  const closedTotal = Number(s?.closed_month_total ?? 0);
  const withBids = Number(s?.closed_month_with_bids ?? 0);
  const tauxConversion = closedTotal > 0 ? withBids / closedTotal : 0;

  const roles = rolesRes.data ?? [];
  const uniqueUsers = new Set(roles.map((r) => r.user_id as string));
  const count = (role: string) => roles.filter((r) => r.role === role).length;

  return {
    totalAuctions: Number(s?.total_auctions ?? 0),
    liveAuctions: Number(s?.live_auctions ?? 0),
    totalUsers: uniqueUsers.size,
    acheteursActifs: count("acheteur"),
    vendeursActifs: count("vendeur"),
    experts: count("expert"),
    ventesValideesMois: Number(s?.validated_month_count ?? 0),
    caMois,
    volumeMois,
    totalVentesValidees: Number(s?.total_validated_volume ?? 0),
    totalVentesEncaissees: (paidPaymentsRes.data ?? []).reduce((sum, r) => sum + (r.amount ?? 0), 0),
    tauxConversion,
    enchersValidationsEnAttente: Number(s?.pending_validations ?? 0),
  };
}

async function getRevenue(days = 30): Promise<RevenuePoint[]> {
  const since = new Date(Date.now() - (days - 1) * 86_400_000);
  since.setHours(0, 0, 0, 0);
  const { data, error } = await supabase.rpc("admin_revenue_series", { p_since: since.toISOString() });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<{ current_price: number; updated_at: string; status: string }>;
  const buckets = new Map<string, { ca: number; ventes: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * 86_400_000);
    buckets.set(d.toISOString().slice(0, 10), { ca: 0, ventes: 0 });
  }
  for (const row of rows) {
    const key = new Date(row.updated_at).toISOString().slice(0, 10);
    const b = buckets.get(key);
    if (!b) continue;
    b.ventes += 1;
    b.ca += Math.round((row.current_price ?? 0) * COMMISSION_RATE);
  }
  return Array.from(buckets.entries()).map(([date, v]) => ({ date, ...v }));
}

/* ──────────────────────────── users ──────────────────────────── */

async function listUsers(): Promise<AdminUser[]> {
  // email + telephone are restricted columns; admins fetch them through a
  // SECURITY DEFINER RPC that re-checks the admin role server-side.
  const [profilesRes, rolesRes] = await Promise.all([
    supabase.rpc("admin_list_profiles"),
    supabase.from("user_roles").select("user_id, role"),
  ]);
  if (profilesRes.error) throw new Error(profilesRes.error.message);
  if (rolesRes.error) throw new Error(rolesRes.error.message);

  const roleByUser = new Map<string, UserRole>();
  for (const r of rolesRes.data ?? []) {
    const cur = roleByUser.get(r.user_id as string);
    const next = r.role as UserRole;
    const rank = (x: UserRole) => ({ admin: 4, expert: 3, vendeur: 2, acheteur: 1 }[x] ?? 0);
    if (!cur || rank(next) > rank(cur)) roleByUser.set(r.user_id as string, next);
  }

  return (profilesRes.data ?? []).map((p: {
    user_id: string; nom: string | null; email: string | null; telephone: string | null;
    actif: boolean | null; caution_validee: boolean | null; caution_montant: number | null;
    created_at: string;
  }) => ({
    id: p.user_id,
    nom: p.nom ?? "",
    email: p.email ?? "",
    telephone: p.telephone ?? "",
    role: roleByUser.get(p.user_id) ?? "acheteur",
    cautionDeposee: !!p.caution_validee,
    cautionMontant: p.caution_montant ?? 0,
    inscritLe: p.created_at?.slice(0, 10) ?? "",
    actif: p.actif ?? true,
  }));
}

async function toggleUserActive(id: string): Promise<void> {
  const { data: prof, error } = await supabase
    .from("profiles")
    .select("actif")
    .eq("user_id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const { error: rpcErr } = await supabase.rpc("admin_set_user_active", {
    p_user_id: id,
    p_actif: !(prof?.actif ?? true),
  });
  if (rpcErr) throw new Error(rpcErr.message);
}

async function createUser(input: {
  nom: string;
  email: string;
  telephone: string;
  role: "admin" | "expert" | "vendeur";
}): Promise<AdminUser> {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) throw new Error("Session expirée");
  const res = await fetch("/api/public/admin-create-user", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  const body = (await res.json()) as { ok: boolean; error?: string; userId?: string };
  if (!res.ok || !body.ok) throw new Error(body.error ?? "Création impossible");
  return {
    id: body.userId!,
    nom: input.nom,
    email: input.email,
    telephone: input.telephone,
    role: input.role,
    cautionDeposee: false,
    cautionMontant: 0,
    inscritLe: new Date().toISOString().slice(0, 10),
    actif: true,
  };
}

/* ──────────────────────────── cars ──────────────────────────── */

async function listCars(): Promise<(Car & { proprietaireId: string })[]> {
  // Sensitive columns aren't directly readable by authenticated users; use admin RPC.
  const { data, error } = await supabase.rpc("admin_list_cars");
  if (error) throw new Error(error.message);
  return (data as CarRow[]).map((r) => ({ ...mapCar(r), proprietaireId: r.vendeur_id ?? "" }));
}

async function createCar(
  input: Partial<Car> & Pick<Car, "marque" | "modele" | "annee" | "prixAttendu">,
): Promise<Car> {
  const { data: existing, error: listErr } = await supabase.rpc("admin_list_cars");
  if (listErr) throw new Error(listErr.message);
  const id = nextCarId(((existing as CarRow[]) ?? []).map((c) => c.id));
  const payload = {
    id,
    ...carPatchToRow({ ...input, status: "open" }),
    marque: input.marque,
    modele: input.modele,
    annee: input.annee,
    prix_attendu: input.prixAttendu,
  };
  const { error } = await supabase
    .from("cars")
    .insert(payload as never)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const { data: full, error: fErr } = await supabase.rpc("admin_list_cars_by_ids", { p_ids: [id] });
  if (fErr) throw new Error(fErr.message);
  return mapCar((full as CarRow[])[0]);
}

async function updateCar(id: string, patch: Partial<Car>): Promise<Car> {
  const { error } = await supabase
    .from("cars")
    .update(carPatchToRow(patch) as never)
    .eq("id", id)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const { data: full, error: fErr } = await supabase.rpc("admin_list_cars_by_ids", { p_ids: [id] });
  if (fErr) throw new Error(fErr.message);
  return mapCar((full as CarRow[])[0]);
}

async function deleteCar(id: string): Promise<void> {
  const { error } = await supabase.from("cars").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/* ──────────────────────────── experts ──────────────────────────── */

async function listExperts(): Promise<Expert[]> {
  const { data: roles, error: rolesErr } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("role", "expert");
  if (rolesErr) throw new Error(rolesErr.message);
  const expertIds = (roles ?? []).map((r) => r.user_id as string);
  if (expertIds.length === 0) return [];

  const [profilesRes, assignmentsRes] = await Promise.all([
    // admin-only RPC — exposes email/telephone after re-checking the admin role.
    supabase.rpc("admin_list_profiles"),
    supabase
      .from("expert_assignments")
      .select("expert_id, status, note_finale")
      .in("expert_id", expertIds),
  ]);
  if (profilesRes.error) throw new Error(profilesRes.error.message);
  if (assignmentsRes.error) throw new Error(assignmentsRes.error.message);

  // Need ville per profile — admin_list_profiles doesn't return it, fetch separately.
  const { data: villes } = await supabase
    .from("profiles")
    .select("user_id, ville")
    .in("user_id", expertIds);
  const villeMap = new Map<string, string>();
  (villes ?? []).forEach((v) => villeMap.set(v.user_id as string, (v.ville as string) ?? "—"));

  const expertIdSet = new Set(expertIds);
  const expertProfiles = (profilesRes.data ?? []).filter(
    (p: { user_id: string }) => expertIdSet.has(p.user_id),
  );

  const byExpert = new Map<string, { en: number; total: number; sumNote: number; cntNote: number }>();
  for (const a of assignmentsRes.data ?? []) {
    const eid = a.expert_id as string | null;
    if (!eid) continue;
    const b = byExpert.get(eid) ?? { en: 0, total: 0, sumNote: 0, cntNote: 0 };
    if (a.status === "en_inspection") b.en += 1;
    if (a.status === "rapport_recu") {
      b.total += 1;
      if (a.note_finale != null) { b.sumNote += a.note_finale; b.cntNote += 1; }
    }
    byExpert.set(eid, b);
  }

  return expertProfiles.map((p: { user_id: string; nom: string | null; email: string | null; actif: boolean | null }) => {
    const b = byExpert.get(p.user_id) ?? { en: 0, total: 0, sumNote: 0, cntNote: 0 };
    return {
      id: p.user_id,
      nom: p.nom ?? "",
      email: p.email ?? "",
      ville: villeMap.get(p.user_id) ?? "—",
      inspectionsEnCours: b.en,
      inspectionsTotal: b.total,
      noteMoyenne: b.cntNote > 0 ? b.sumNote / b.cntNote : 0,
      actif: p.actif ?? true,
    };
  });
}

async function listAssignments(): Promise<ExpertAssignment[]> {
  const { data, error } = await supabase
    .from("expert_assignments")
    .select("id, car_id, expert_id, status, assigne_le, rapport_recu_le, note_finale")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const carIds = rows.map((r) => r.car_id as string);
  const expertIds = Array.from(new Set(rows.map((r) => r.expert_id).filter(Boolean) as string[]));

  const [carsRes, profsRes] = await Promise.all([
    carIds.length
      ? supabase.from("cars").select("id, marque, modele, annee").in("id", carIds)
      : Promise.resolve({ data: [], error: null } as const),
    expertIds.length
      ? supabase.from("profiles").select("user_id, nom").in("user_id", expertIds)
      : Promise.resolve({ data: [], error: null } as const),
  ]);

  const carLabel = new Map<string, string>();
  for (const c of carsRes.data ?? []) {
    carLabel.set(c.id as string, `${c.marque} ${c.modele} (${c.annee})`);
  }
  const expertName = new Map<string, string>();
  for (const p of profsRes.data ?? []) expertName.set(p.user_id as string, p.nom ?? "");

  return rows.map((r) => ({
    id: r.id as string,
    carId: r.car_id as string,
    carLabel: carLabel.get(r.car_id as string) ?? r.car_id as string,
    expertId: (r.expert_id as string) ?? null,
    expertNom: r.expert_id ? expertName.get(r.expert_id as string) ?? null : null,
    status: r.status as ExpertAssignment["status"],
    assigneLe: r.assigne_le as string | null,
    rapportRecuLe: r.rapport_recu_le as string | null,
    noteFinale: (r.note_finale as number) ?? null,
  }));
}

async function assignExpert(carId: string, expertId: string): Promise<void> {
  const { error } = await supabase.rpc("assign_expert", { p_car_id: carId, p_expert_id: expertId });
  if (error) throw new Error(error.message);
}

/* ─────────────────────── auctions / events ─────────────────────── */

async function listExpertiseReady(): Promise<(Car & { proprietaireId: string; noteFinale: number })[]> {
  const { data, error } = await supabase.rpc("admin_list_expertise_ready");
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<{ car: CarRow; note_finale: number }>;
  return rows.map((r) => ({
    ...mapCar(r.car),
    proprietaireId: r.car.vendeur_id ?? "",
    noteFinale: r.note_finale ?? 0,
  }));
}

type CreateAuctionOpts = {
  startingPrice: number;
  durationHours: number;
  startsAt?: string;
  visibility?: "ouvert" | "ferme";
  auctionType?: "ouverte" | "fermee";
  minimumAcceptedPrice?: number;
  eventId?: string;
};

async function insertAuctionRow(car: CarRow, opts: CreateAuctionOpts) {
  const startsAtMs = opts.startsAt ? new Date(opts.startsAt).getTime() : Date.now();
  const startsAt = new Date(startsAtMs).toISOString();
  const endsAt = new Date(startsAtMs + opts.durationHours * 3600_000).toISOString();
  const status = startsAtMs <= Date.now() ? "live" : "scheduled";
  const auctionType = opts.auctionType ?? "ouverte";
  const id = `${car.id}-${Date.now().toString(36)}`;
  const { error } = await supabase
    .from("auctions")
    .insert({
      id,
      car_id: car.id,
      event_id: opts.eventId ?? null,
      starts_at: startsAt,
      ends_at: endsAt,
      starting_price: opts.startingPrice,
      current_price: opts.startingPrice,
      status,
      visibility: opts.visibility ?? "ouvert",
      auction_type: auctionType,
    } as never)
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // Mark car as in-auction and store minimum accepted price
  await supabase
    .from("cars")
    .update({
      status: "en_cours" as const,
      minimum_accepted_price: opts.minimumAcceptedPrice ?? null,
    } as never)
    .eq("id", car.id);

  return { id };
}

async function createAuctionFromCar(carId: string, opts: CreateAuctionOpts): Promise<Auction> {
  // Fetch car via SECURITY DEFINER (admins get sensitive columns).
  const { data: car, error } = await supabase.rpc("get_car_full", { p_car_id: carId });
  if (error) throw new Error(error.message);
  if (!car) throw new Error("Voiture introuvable");
  if ((car as CarRow).status !== "open") throw new Error("Cette voiture est déjà en enchère");
  const inserted = await insertAuctionRow(car as CarRow, opts);
  // Re-fetch full auction row via admin RPC
  const { data: fullAuction, error: aErr } = await supabase.rpc("admin_get_auction", { p_id: inserted.id });
  if (aErr) throw new Error(aErr.message);
  const c = mapCar(car as CarRow);
  const f = fullAuction as Record<string, unknown>;
  return {
    id: f.id as string,
    car: c,
    startsAt: f.starts_at as string,
    endsAt: f.ends_at as string,
    currentPrice: f.current_price as number,
    startingPrice: f.starting_price as number,
    bidCount: f.bid_count as number,
    status: f.status as Auction["status"],
    visibility: f.visibility as Auction["visibility"],
    topBidderId: (f.top_bidder_id as string) ?? null,
    auctionType: f.auction_type as Auction["auctionType"],
    eventId: (f.event_id as string) ?? null,
  };
}


async function createMultiCarEvent(input: {
  title: string;
  durationHours: number;
  startsAt?: string;
  visibility: "ouvert" | "ferme";
  auctionType?: "ouverte" | "fermee";
  items: { carId: string; startingPrice: number; minimumAcceptedPrice?: number }[];
}): Promise<AuctionEvent> {
  if (input.items.length === 0) throw new Error("Sélectionnez au moins une voiture");
  const auctionType = input.auctionType ?? (input.visibility === "ferme" ? "fermee" : "ouverte");
  const startsAtMs = input.startsAt ? new Date(input.startsAt).getTime() : Date.now();
  const startsAt = new Date(startsAtMs).toISOString();
  const endsAt = new Date(startsAtMs + input.durationHours * 3600_000).toISOString();
  const eventId = `evt-${Date.now().toString(36)}`;
  const status = startsAtMs <= Date.now() ? "live" : "scheduled";

  const { data: ev, error: evErr } = await supabase
    .from("auction_events")
    .insert({
      id: eventId,
      title: input.title,
      starts_at: startsAt,
      ends_at: endsAt,
      visibility: input.visibility,
      status,
    } as never)
    .select("*")
    .single();
  if (evErr) throw new Error(evErr.message);

  const carIds = input.items.map((it) => it.carId);
  const { data: cars, error: cErr } = await supabase.rpc("admin_list_cars_by_ids", { p_ids: carIds });
  if (cErr) throw new Error(cErr.message);
  const carById = new Map<string, CarRow>((cars as CarRow[]).map((c) => [c.id, c]));

  const lotIds: string[] = [];
  for (const it of input.items) {
    const car = carById.get(it.carId);
    if (!car) throw new Error(`Voiture ${it.carId} introuvable`);
    if (car.status !== "open") throw new Error(`Voiture ${it.carId} déjà en enchère`);
    const r = await insertAuctionRow(car, {
      startingPrice: it.startingPrice,
      durationHours: input.durationHours,
      startsAt,
      visibility: input.visibility,
      auctionType,
      minimumAcceptedPrice: it.minimumAcceptedPrice,
      eventId,
    });
    lotIds.push(r.id);
  }

  const e = ev as Record<string, unknown>;
  return {
    id: e.id as string,
    title: e.title as string,
    startsAt: e.starts_at as string,
    endsAt: e.ends_at as string,
    status: e.status as AuctionEvent["status"],
    visibility: e.visibility as AuctionEvent["visibility"],
    lotIds,
  };
}

/* ──────────────────────────── validations ──────────────────────────── */

async function listPendingValidations(): Promise<PendingValidation[]> {
  const { data, error } = await supabase.rpc("admin_list_pending_validations");
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<{
    id: string; car_id: string; current_price: number; ends_at: string;
    top_bidder_id: string | null; updated_at: string; closed_at: string | null;
    admin_validation_deadline: string | null;
    marque: string; modele: string; annee: number; vendeur_nom: string; prix_attendu: number;
  }>;
  const bidderIds = Array.from(new Set(rows.map((r) => r.top_bidder_id).filter(Boolean) as string[]));
  const { data: profs } = bidderIds.length
    ? await supabase.from("profiles").select("user_id, nom").in("user_id", bidderIds)
    : { data: [] as { user_id: string; nom: string }[] };
  const nameById = new Map((profs ?? []).map((p) => [p.user_id as string, p.nom as string]));

  return rows.map((r) => {
    const ecart = r.current_price - (r.prix_attendu ?? 0);
    const raison: PendingValidation["raison"] = Math.abs(ecart) > 5000 ? "ecart_prix" : "verification_paiement";
    return {
      auctionId: r.id,
      carId: r.car_id,
      carLabel: `${r.marque} ${r.modele} (${r.annee})`,
      vendeurNom: r.vendeur_nom ?? "—",
      acheteurNom: r.top_bidder_id ? nameById.get(r.top_bidder_id) ?? "Acheteur" : "—",
      prixFinal: r.current_price,
      prixAttendu: r.prix_attendu ?? 0,
      termineLe: new Date(r.ends_at).toLocaleString("fr-MA", { dateStyle: "short", timeStyle: "short" }),
      raison,
      adminValidationDeadline: r.admin_validation_deadline,
    };
  });
}

async function validateAuction(auctionId: string, decision: "validee" | "annulee"): Promise<void> {
  const { error } = await supabase.rpc("validate_auction", {
    p_auction_id: auctionId,
    p_decision: decision,
  });
  if (error) throw new Error(error.message);
}

export type ProcessedValidation = {
  auctionId: string;
  carId: string;
  carLabel: string;
  acheteurNom: string;
  vendeurNom: string;
  prixFinal: number;
  decision: "validee" | "annulee";
  decideLe: string | null;
  paymentStatus: "aucun" | "en_attente" | "paye" | "annule" | "rembourse";
  paymentDeadline: string | null;
};

async function listProcessedValidations(): Promise<ProcessedValidation[]> {
  const { data, error } = await supabase.rpc("admin_list_processed_validations");
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Array<{
    id: string; car_id: string; current_price: number; status: string;
    top_bidder_id: string | null; validated_at: string | null; updated_at: string;
    payment_deadline: string | null;
    marque: string; modele: string; annee: number; vendeur_nom: string;
  }>;
  const bidderIds = Array.from(new Set(rows.map((r) => r.top_bidder_id).filter(Boolean) as string[]));
  const auctionIds = rows.map((r) => r.id);

  const [profsRes, paysRes] = await Promise.all([
    bidderIds.length
      ? supabase.from("profiles").select("user_id, nom").in("user_id", bidderIds)
      : Promise.resolve({ data: [] as { user_id: string; nom: string }[] }),
    auctionIds.length
      ? supabase
          .from("payments")
          .select("auction_id, status, updated_at")
          .eq("type", "achat")
          .in("auction_id", auctionIds)
      : Promise.resolve({ data: [] as { auction_id: string; status: string; updated_at: string }[] }),
  ]);
  const nameById = new Map((profsRes.data ?? []).map((p) => [p.user_id as string, p.nom as string]));
  const payByAuction = new Map<string, { status: string; updated_at: string }>();
  for (const p of paysRes.data ?? []) {
    const cur = payByAuction.get(p.auction_id as string);
    if (!cur || new Date(p.updated_at as string) > new Date(cur.updated_at)) {
      payByAuction.set(p.auction_id as string, { status: p.status as string, updated_at: p.updated_at as string });
    }
  }

  return rows.map((r) => {
    const pay = payByAuction.get(r.id);
    return {
      auctionId: r.id,
      carId: r.car_id,
      carLabel: `${r.marque} ${r.modele} (${r.annee})`,
      acheteurNom: r.top_bidder_id ? nameById.get(r.top_bidder_id) ?? "Acheteur" : "—",
      vendeurNom: r.vendeur_nom ?? "—",
      prixFinal: r.current_price,
      decision: r.status === "validated" ? "validee" : "annulee",
      decideLe: r.validated_at ?? r.updated_at ?? null,
      paymentStatus: (pay?.status as ProcessedValidation["paymentStatus"]) ?? "aucun",
      paymentDeadline: r.payment_deadline,
    };
  });
}

export const supabaseAdminApi = {
  getStats,
  getRevenue,
  listUsers,
  toggleUserActive,
  createUser,
  listCars,
  createCar,
  updateCar,
  deleteCar,
  listExperts,
  listAssignments,
  assignExpert,
  listExpertiseReady,
  createAuctionFromCar,
  createMultiCarEvent,
  listPendingValidations,
  validateAuction,
  listProcessedValidations,
};
