import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Car as CarIcon, Hash } from "lucide-react";
import { api } from "@/lib/api";
import type { Auction } from "@/types/auction";
import { formatMad, formatDateTime, listingPriceTier, priceTierTextClass } from "@/lib/format";
import { requireAuth } from "@/lib/routeGuard";
import { useAuth } from "@/lib/auth";
import { supabaseVendeurApi } from "@/lib/supabaseVendeurApi";
import { resolveCarImageUrl } from "@/lib/carImages";
import { Dropdown } from "@/components/ui/dropdown";
import { AuthGate } from "@/components/AuthGate";

export const Route = createFileRoute("/vehicules")({
  beforeLoad: ({ location }) => requireAuth(location.href),
  head: () => ({
    meta: [
      { title: "Véhicules — Bidlik" },
      { name: "description", content: "Catalogue des véhicules en enchère sur Bidlik. Filtrez par marque, carburant, statut et enchère." },
      { property: "og:title", content: "Véhicules — Bidlik" },
      { property: "og:description", content: "Catalogue des véhicules en enchère avec filtres avancés." },
    ],
  }),
  component: VehiculesPage,
});

type StatusFilter = "all" | "live" | "scheduled" | "closed";

function VehiculesPage() {
  const { hasRole, hasAnyRole } = useAuth();
  const isVendeurOnly = hasRole("vendeur") && !hasAnyRole(["admin", "acheteur"]);
  const [lots, setLots] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [marque, setMarque] = useState<string>("all");
  const [carburant, setCarburant] = useState<string>("all");
  const [eventId, setEventId] = useState<string>("all");
  const [onlyLive, setOnlyLive] = useState(false);

  useEffect(() => {
    setLoading(true);
    const load = async () => {
      const all = await api.listAuctions("all");
      if (isVendeurOnly) {
        const myCars = await supabaseVendeurApi.listCars();
        const mine = new Set(myCars.map((c) => c.auctionId).filter((x): x is string => !!x));
        setLots(all.filter((a) => mine.has(a.id)));
      } else {
        setLots(all);
      }
      setLoading(false);
    };
    void load();
  }, [isVendeurOnly]);

  const marques = useMemo(
    () => Array.from(new Set(lots.map((l) => l.car.marque))).sort(),
    [lots],
  );
  const eventIds = useMemo(
    () => Array.from(new Set(lots.map((l) => l.eventId).filter((e): e is string => !!e))).sort(),
    [lots],
  );

  const filtered = lots.filter((l) => {
    if (onlyLive && l.status !== "live") return false;
    if (status !== "all") {
      if (status === "live" && l.status !== "live") return false;
      if (status === "scheduled" && l.status !== "scheduled") return false;
      if (status === "closed" && !["closed", "validated", "cancelled"].includes(l.status)) return false;
    }
    if (marque !== "all" && l.car.marque !== marque) return false;
    if (carburant !== "all" && l.car.carburant !== carburant) return false;
    if (eventId !== "all" && l.eventId !== eventId) return false;
    if (query) {
      const q = query.toLowerCase();
      const hay = `${l.car.id} ${l.id} ${l.eventId ?? ""} ${l.car.marque} ${l.car.modele} ${l.car.finition}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <AuthGate>
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Véhicules</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Catalogue de toutes les voitures mises en enchère. Filtrez par marque, carburant, statut ou enchère.
        </p>
      </header>

      <div className="mb-5 grid gap-3 rounded-xl border border-border bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-6">
        <label className="block sm:col-span-2 lg:col-span-2">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Recherche</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ID, marque, modèle…"
              className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </label>
        <Select label="Statut" value={status} onChange={(v) => setStatus(v as StatusFilter)} options={[
          { value: "all", label: "Tous" },
          { value: "live", label: "En direct" },
          { value: "scheduled", label: "Programmées" },
          { value: "closed", label: "Terminées" },
        ]} />
        <Select label="Marque" value={marque} onChange={setMarque} options={[
          { value: "all", label: "Toutes" },
          ...marques.map((m) => ({ value: m, label: m })),
        ]} />
        <Select label="Carburant" value={carburant} onChange={setCarburant} options={[
          { value: "all", label: "Tous" },
          { value: "essence", label: "Essence" },
          { value: "diesel", label: "Diesel" },
          { value: "hybride", label: "Hybride" },
          { value: "electrique", label: "Électrique" },
        ]} />
        <Select label="Enchère" value={eventId} onChange={setEventId} options={[
          { value: "all", label: "Toutes" },
          ...eventIds.map((e) => ({ value: e, label: `#${e}` })),
        ]} />
        <div className="block">
          <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Affichage</span>
          <div className="inline-flex h-10 w-full rounded-md border border-input bg-background p-0.5 shadow-sm">
            <button
              type="button"
              onClick={() => setOnlyLive(true)}
              className={`flex-1 rounded-[5px] text-xs font-semibold transition-colors ${onlyLive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              En cours
            </button>
            <button
              type="button"
              onClick={() => setOnlyLive(false)}
              className={`flex-1 rounded-[5px] text-xs font-semibold transition-colors ${!onlyLive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Tous
            </button>
          </div>
        </div>
      </div>

      <p className="mb-3 text-xs text-muted-foreground">
        {loading ? "Chargement…" : `${filtered.length} véhicule${filtered.length > 1 ? "s" : ""}`}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((l) => (
          <VehiculeCard key={l.id} lot={l} />
        ))}
      </div>

      {!loading && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <CarIcon className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Aucun véhicule ne correspond aux filtres.</p>
        </div>
      )}
    </div>
    </AuthGate>
  );
}

function VehiculeCard({ lot }: { lot: Auction }) {
  const c = lot.car;
  const img = c.images?.[0] ? resolveCarImageUrl(c.images[0]) : undefined;
  const priceClass = c.prixPlancher
    ? priceTierTextClass(listingPriceTier(lot.currentPrice, c))
    : "text-foreground";
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <Link
        to="/auctions/$auctionId"
        params={{ auctionId: lot.id }}
        className="relative block aspect-[16/10] overflow-hidden bg-secondary"
        aria-label={`Voir ${c.marque} ${c.modele}`}
      >
        {img ? (
          <img src={img} alt={`${c.marque} ${c.modele}`} className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground"><CarIcon className="h-10 w-10" /></div>
        )}
        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-background/95 px-2 py-1 text-[11px] font-mono font-semibold text-foreground shadow-sm">
          <Hash className="h-3 w-3" />{c.id}
        </span>
        <StatusPill status={lot.status} />
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <h3 className="text-base font-semibold text-foreground"><span className="font-mono text-primary">#{c.id}</span> — {c.marque} {c.modele}</h3>
          <p className="text-xs text-muted-foreground">{c.finition} · {c.annee} · {c.kilometrage.toLocaleString("fr-MA")} km</p>
        </div>
        <dl className="grid grid-cols-2 gap-1 text-xs">
          <dt className="text-muted-foreground">Prix actuel</dt>
          <dd className={`text-right font-semibold ${priceClass}`}>{formatMad(lot.currentPrice)}</dd>
          <dt className="text-muted-foreground">Carburant</dt>
          <dd className="text-right text-foreground capitalize">{c.carburant}</dd>
          <dt className="text-muted-foreground">Fin</dt>
          <dd className="text-right text-foreground">{formatDateTime(lot.endsAt)}</dd>
        </dl>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 border-t border-border pt-2 text-[11px]">
          {lot.eventId ? (
            <Link
              to="/events/$eventId"
              params={{ eventId: lot.eventId }}
              className="inline-flex items-center gap-1 rounded-md bg-accent/10 px-2 py-0.5 font-mono text-accent hover:bg-accent/20"
            >
              <Hash className="h-3 w-3" />Enchère {lot.eventId}
            </Link>
          ) : (
            <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground">Hors enchère groupée</span>
          )}
        </div>
        <Link
          to="/auctions/$auctionId"
          params={{ auctionId: lot.id }}
          className="mt-2 inline-flex h-9 items-center justify-center rounded-md bg-accent text-sm font-semibold text-accent-foreground transition-opacity hover:opacity-90"
        >
          Voir le véhicule
        </Link>
      </div>
    </article>
  );
}

function StatusPill({ status }: { status: Auction["status"] }) {
  const map: Record<Auction["status"], { label: string; cls: string }> = {
    live: { label: "EN DIRECT", cls: "bg-destructive text-destructive-foreground" },
    scheduled: { label: "PROGRAMMÉE", cls: "bg-warning text-warning-foreground" },
    closed: { label: "TERMINÉE", cls: "bg-muted text-muted-foreground" },
    validated: { label: "VALIDÉE", cls: "bg-success text-success-foreground" },
    cancelled: { label: "ANNULÉE", cls: "bg-muted text-muted-foreground" },
  };
  const { label, cls } = map[status];
  return (
    <span className={`absolute right-2 top-2 rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

function Select({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <Dropdown value={value} onChange={onChange} options={options} ariaLabel={label} />
    </label>
  );
}
