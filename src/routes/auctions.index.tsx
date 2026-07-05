import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarClock, Car as CarIcon, Hash, Lock } from "lucide-react";
import { api } from "@/lib/api";
import type { AuctionEvent } from "@/types/auction";
import { Countdown } from "@/components/Countdown";
import { formatDateTime } from "@/lib/format";
import { requireRole } from "@/lib/routeGuard";
import { useAuth } from "@/lib/auth";
import { supabaseVendeurApi } from "@/lib/supabaseVendeurApi";

type Filter = "live" | "scheduled" | "closed";
type Search = { filter?: Filter };

export const Route = createFileRoute("/auctions/")({
  validateSearch: (s: Record<string, unknown>): Search => {
    const f = s.filter;
    return f === "live" || f === "scheduled" || f === "closed" ? { filter: f } : {};
  },
  beforeLoad: ({ location }) => requireRole(["acheteur", "admin", "vendeur"], location.href),
  head: () => ({
    meta: [
      { title: "Enchères — Bidlik" },
      {
        name: "description",
        content:
          "Toutes les enchères Bidlik : événements multi-voitures avec dates, type et nombre de lots.",
      },
    ],
  }),
  component: AuctionsPage,
});

function AuctionsPage() {
  const search = Route.useSearch();
  const filter: Filter = search.filter ?? "live";
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const isVendeurOnly = hasRole("vendeur") && !hasRole("admin");
  const [events, setEvents] = useState<AuctionEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const apiFilter = filter === "closed" ? "closed" : "live";
    const load = async () => {
      const all = await api.listEvents(apiFilter);
      // listEvents("live") returns both live + scheduled; split client-side.
      const scoped = all.filter((ev) => {
        if (filter === "live") return ev.status === "live";
        if (filter === "scheduled") return ev.status === "scheduled";
        return true; // closed handled by API filter
      });
      if (isVendeurOnly) {
        const myCars = await supabaseVendeurApi.listCars();
        const mine = new Set(myCars.map((c) => c.auctionId).filter((x): x is string => !!x));
        setEvents(scoped.filter((ev) => ev.lotIds.some((id) => mine.has(id))));
      } else {
        setEvents(scoped);
      }
      setLoading(false);
    };
    void load();
  }, [filter, isVendeurOnly]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Enchères</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Chaque enchère regroupe plusieurs voitures avec un identifiant unique, des dates et un type.
        </p>
      </header>

      <div className="mb-6 inline-flex rounded-lg border border-border bg-card p-1">
        <TabBtn active={filter === "live"} onClick={() => navigate({ to: "/auctions", search: { filter: "live" } })}>
          En cours
        </TabBtn>
        <TabBtn active={filter === "scheduled"} onClick={() => navigate({ to: "/auctions", search: { filter: "scheduled" } })}>
          À venir
        </TabBtn>
        <TabBtn active={filter === "closed"} onClick={() => navigate({ to: "/auctions", search: { filter: "closed" } })}>
          Terminées
        </TabBtn>
      </div>


      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">Aucune enchère pour l'instant.</p>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((ev) => {
            const isLive = ev.status === "live";
            const isScheduled = ev.status === "scheduled";
            const isClosed = !isLive && !isScheduled;
            return (
              <li key={ev.id}>
                <Link
                  to="/events/$eventId"
                  params={{ eventId: ev.id }}
                  className="block overflow-hidden rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={[
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        isLive
                          ? "bg-destructive text-destructive-foreground"
                          : isScheduled
                            ? "bg-accent/15 text-accent"
                            : "bg-secondary text-secondary-foreground",
                      ].join(" ")}
                    >
                      {isLive ? "EN DIRECT" : isScheduled ? "PROGRAMMÉE" : "TERMINÉE"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                      <Hash className="h-3 w-3" /> {ev.id}
                    </span>
                  </div>

                  <h2 className="mt-3 text-lg font-bold text-foreground">{ev.title}</h2>

                  <dl className="mt-4 space-y-1.5 text-xs">
                    <Row icon={<CarIcon className="h-3.5 w-3.5" />} label="Lots">
                      <span className="font-semibold text-foreground">
                        {ev.lotIds.length} {ev.lotIds.length > 1 ? "voitures" : "voiture"}
                      </span>
                    </Row>
                    <Row icon={ev.visibility === "ferme" ? <Lock className="h-3.5 w-3.5" /> : <CarIcon className="h-3.5 w-3.5" />} label="Type">
                      <span className={[
                        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        ev.visibility === "ferme" ? "bg-primary/15 text-primary" : "bg-accent/15 text-accent",
                      ].join(" ")}>
                        {ev.visibility === "ferme" ? "🔒 Enchère fermée" : "Enchère ouverte"}
                      </span>
                    </Row>
                    <Row icon={<CalendarClock className="h-3.5 w-3.5" />} label="Début">
                      <span className="text-foreground">{formatDateTime(ev.startsAt)}</span>
                    </Row>
                    <Row icon={<CalendarClock className="h-3.5 w-3.5" />} label="Fin">
                      <span className="text-foreground">{formatDateTime(ev.endsAt)}</span>
                    </Row>
                  </dl>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
                    <span className="text-xs text-muted-foreground">
                      {isScheduled ? "Démarre dans" : isLive ? "Termine dans" : "Clôturée"}
                    </span>
                    {!isClosed ? (
                      <Countdown endsAt={isScheduled ? ev.startsAt : ev.endsAt} compact />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </span>
      {children}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-md px-4 py-1.5 text-sm font-semibold transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
