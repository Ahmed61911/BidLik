import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Truck, CheckCircle2, XCircle, Clock, Download, FileText, Star } from "lucide-react";
import { getCarExpertise } from "@/lib/supabaseApi";
import { supabase } from "@/integrations/supabase/client";
import { storage } from "@/lib/storage";
import type { CarExpertise } from "@/types/expert";
import { formatMad, formatDateTime } from "@/lib/format";
import { CarGallery } from "@/components/CarGallery";
import { DeadlineCountdown } from "@/components/DeadlineCountdown";
import { requireRole } from "@/lib/routeGuard";
import { getCarImages } from "@/lib/carImages";

type WonAuction = {
  id: string;
  status: "closed" | "validated" | "cancelled" | "live" | "scheduled";
  current_price: number;
  starting_price: number;
  starts_at: string;
  ends_at: string;
  closed_at: string | null;
  validated_at: string | null;
  payment_deadline: string | null;
  bid_count: number;
  auction_type: string;
  visibility: string;
};
type WonCar = {
  id: string;
  marque: string;
  modele: string;
  annee: number;
  finition: string | null;
  kilometrage: number;
  transmission: string;
  carburant: string;
  couleur_exterieur: string | null;
  couleur_interieur: string | null;
  puissance_fiscale: number;
  nombre_cles: number;
  procuration: string;
  body_type: string | null;
  note_expert: number | null;
  status: string;
  payment_status: "non_paye" | "paye";
  delivery_status: "non_livre" | "livre";
  images: string[] | null;
  expert_images: string[] | null;
  vendeur_nom: string;
};
type WonPayload = { auction: WonAuction; car: WonCar };
type WonStatus = "en_attente" | "validee" | "livree" | "annulee";

async function fetchWon(auctionId: string): Promise<WonPayload> {
  const { data, error } = await supabase.rpc("get_my_won_car_details", { p_auction_id: auctionId });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Introuvable");
  return data as unknown as WonPayload;
}

export const Route = createFileRoute("/acheteur/gagnees/$auctionId")({
  ssr: false,
  beforeLoad: ({ location }) => requireRole(["acheteur"], location.href),
  loader: async ({ params }) => {
    const payload = await fetchWon(params.auctionId);
    const expertise = await getCarExpertise(payload.car.id).catch(() => null);
    return { payload, expertise };
  },
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-sm text-destructive">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
        >
          Réessayer
        </button>
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
      Enchère introuvable.{" "}
      <Link to="/acheteur/gagnees" className="font-semibold text-accent hover:underline">
        Retour
      </Link>
    </div>
  ),
  component: WonCarDetailsPage,
});

function computeStatus(p: WonPayload): WonStatus {
  if (p.auction.status === "cancelled" || p.car.status === "vendu_annulee") return "annulee";
  if (p.car.delivery_status === "livre") return "livree";
  if (p.auction.status === "validated") return "validee";
  return "en_attente";
}

function WonCarDetailsPage() {
  const { payload: initial, expertise } = Route.useLoaderData();
  const [payload, setPayload] = useState<WonPayload>(initial);
  const [reportUrl, setReportUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function refresh() {
      try {
        const fresh = await fetchWon(initial.auction.id);
        if (alive) setPayload(fresh);
      } catch {
        /* noop */
      }
    }
    const ch = supabase
      .channel(`won-car-${initial.auction.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "auctions", filter: `id=eq.${initial.auction.id}` }, () => void refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "cars", filter: `id=eq.${initial.car.id}` }, () => void refresh())
      .subscribe();
    return () => { alive = false; void supabase.removeChannel(ch); };
  }, [initial.auction.id, initial.car.id]);

  useEffect(() => {
    let alive = true;
    async function sign() {
      const path = (expertise as CarExpertise | null)?.rapportUrl;
      if (!path) return;
      try {
        const url = await storage.signedUrl("car-images", path);
        if (alive) setReportUrl(url);
      } catch {
        /* noop */
      }
    }
    void sign();
    return () => { alive = false; };
  }, [expertise]);

  const status = computeStatus(payload);
  const { car, auction } = payload;
  const images = car.images && car.images.length ? car.images : getCarImages(car.marque);

  return (
    <div className="space-y-5">
      <Link
        to="/acheteur/gagnees"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voitures gagnées
      </Link>

      <header className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-mono text-primary">#{car.id}</p>
            <h1 className="mt-1 text-xl font-bold text-foreground sm:text-2xl">
              {car.marque} {car.modele}{" "}
              <span className="font-normal text-muted-foreground">({car.annee})</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Prix final :{" "}
              <span className="font-semibold text-foreground">{formatMad(auction.current_price)}</span>
              {car.payment_status === "paye" && (
                <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                  Payée
                </span>
              )}
            </p>
          </div>
          <StatusBadge status={status} />
        </div>
      </header>

      <CarGallery images={images} marque={car.marque} modele={car.modele} />

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-semibold text-foreground">Suivi de la transaction</h2>
        <ul className="mt-3 space-y-2 text-sm">
          <TimelineItem
            done={true}
            title="Enchère remportée"
            date={auction.closed_at ?? auction.ends_at}
          />
          <TimelineItem
            done={auction.status === "validated" || auction.status === "cancelled" || car.delivery_status === "livre"}
            active={status === "en_attente"}
            title="Validation par l'administrateur"
            date={auction.validated_at}
            note={status === "en_attente" ? "En attente…" : undefined}
          />
          <TimelineItem
            done={car.payment_status === "paye"}
            active={status === "validee" && car.payment_status !== "paye"}
            title="Paiement du véhicule"
            note={car.payment_status === "paye" ? "Payé" : undefined}
            extra={
              status === "validee" && car.payment_status !== "paye" && auction.payment_deadline ? (
                <span className="inline-flex items-center gap-1.5 text-xs text-amber-700">
                  <Clock className="h-3.5 w-3.5" /> Sous : <DeadlineCountdown deadline={auction.payment_deadline} />
                </span>
              ) : null
            }
          />
          <TimelineItem
            done={car.delivery_status === "livre"}
            active={car.payment_status === "paye" && car.delivery_status !== "livre"}
            title="Livraison du véhicule"
            note={car.delivery_status === "livre" ? "Livré" : status === "annulee" ? "—" : "En attente"}
          />
        </ul>
        {status === "validee" && car.payment_status !== "paye" && (
          <Link
            to="/acheteur/paiements"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Régler et téléverser le justificatif
          </Link>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-semibold text-foreground">Caractéristiques</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          <Info label="Marque" value={car.marque} />
          <Info label="Modèle" value={car.modele} />
          <Info label="Année" value={String(car.annee)} />
          <Info label="Kilométrage" value={`${car.kilometrage.toLocaleString("fr-MA")} km`} />
          <Info label="Carburant" value={car.carburant} />
          <Info label="Boîte" value={car.transmission} />
          <Info label="Carrosserie" value={car.body_type || "—"} />
          <Info label="Finition" value={car.finition || "—"} />
          <Info label="Couleur ext." value={car.couleur_exterieur || "—"} />
          <Info label="Couleur int." value={car.couleur_interieur || "—"} />
          <Info label="Puissance fiscale" value={`${car.puissance_fiscale} CV`} />
          <Info label="Nombre de clés" value={String(car.nombre_cles)} />
          <Info label="Procuration" value={car.procuration} />
          <Info label="Vendeur" value={car.vendeur_nom || "—"} />
        </dl>
      </section>

      {expertise && (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">Rapport d'expertise</h2>
            {expertise.noteFinale != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                {expertise.noteFinale}/10
              </span>
            )}
          </div>
          {expertise.commentaire && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{expertise.commentaire}</p>
          )}
          {reportUrl && (
            <a
              href={reportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-sm font-semibold text-foreground hover:bg-secondary/80"
            >
              <Download className="h-4 w-4" /> Télécharger le rapport PDF
            </a>
          )}
          {!reportUrl && expertise.rapportUrl && (
            <p className="mt-3 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" /> Préparation du lien de téléchargement…
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-sm text-foreground">{value}</dd>
    </div>
  );
}

function TimelineItem({
  done,
  active = false,
  title,
  date,
  note,
  extra,
}: {
  done: boolean;
  active?: boolean;
  title: string;
  date?: string | null;
  note?: string;
  extra?: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={[
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
          done
            ? "border-emerald-500 bg-emerald-500 text-white"
            : active
              ? "border-amber-500 bg-amber-50 text-amber-700"
              : "border-border bg-card text-muted-foreground",
        ].join(" ")}
      >
        {done ? <CheckCircle2 className="h-3 w-3" /> : active ? <Clock className="h-3 w-3" /> : null}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`font-medium ${done ? "text-foreground" : active ? "text-amber-800" : "text-muted-foreground"}`}>
          {title}
        </p>
        {date && <p className="text-xs text-muted-foreground">{formatDateTime(date)}</p>}
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
        {extra && <div className="mt-1">{extra}</div>}
      </div>
    </li>
  );
}

function StatusBadge({ status }: { status: WonStatus }) {
  const map: Record<WonStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    en_attente: { label: "En attente", cls: "bg-amber-100 text-amber-800", icon: <Clock className="h-3 w-3" /> },
    validee: { label: "Validée", cls: "bg-blue-100 text-blue-800", icon: <CheckCircle2 className="h-3 w-3" /> },
    livree: { label: "Livrée", cls: "bg-emerald-100 text-emerald-800", icon: <Truck className="h-3 w-3" /> },
    annulee: { label: "Annulée", cls: "bg-muted text-muted-foreground", icon: <XCircle className="h-3 w-3" /> },
  };
  const s = map[status];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${s.cls}`}>
      {s.icon}
      {s.label}
    </span>
  );
}
