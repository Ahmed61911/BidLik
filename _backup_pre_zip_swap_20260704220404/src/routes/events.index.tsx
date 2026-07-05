import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarClock, Car as CarIcon } from "lucide-react";
import { api } from "@/lib/api";
import type { AuctionEvent, AuctionType } from "@/types/auction";
import { Countdown } from "@/components/Countdown";
import { formatDateTime } from "@/lib/format";
import { requireRole } from "@/lib/routeGuard";
import { useAuth } from "@/lib/auth";
import { supabaseVendeurApi } from "@/lib/supabaseVendeurApi";
import { supabase } from "@/integrations/supabase/client";

type Filter = "live" | "closed";
type Search = { filter?: Filter };

export const Route = createFileRoute("/events/")({
  validateSearch: (s: Record<string, unknown>): Search => {
    const f = s.filter;
    return f === "closed" || f === "live" ? { filter: f } : {};
  },
  beforeLoad: ({ location }) => requireRole(["acheteur", "admin", "vendeur"], location.href),
  head: () => ({
    meta: [
      { title: "Événements d'enchères — Bidlik" },
      { name: "description", content: "Découvrez les ventes multi-voitures à venir et en cours sur Bidlik." },
    ],
  }),
  component: EventsListPage,
});

function EventsListPage() {
  const search = Route.useSearch();
  const filter: Filter = search.filter ?? "live";
  const navigate = useNavigate();
  const { hasRole, hasAnyRole } = useAuth();
  const isVendeurOnly = hasRole("vendeur") && !hasAnyRole(["admin", "acheteur"]);
  const [events, setEvents] = useState<AuctionEvent[]>([]);
  const [typesByEvent, setTypesByEvent] = useState<Record<string, AuctionType>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const load = async () => {
      const all = await api.listEvents(filter);
      let visible = all;
      if (isVendeurOnly) {
        const myCars = await supabaseVendeurApi.listCars();
        const mine = new Set(myCars.map((c) => c.auctionId).filter((x): x is string => !!x));
        visible = all.filter((ev) => ev.lotIds.some((id) => mine.has(id)));
      }
      setEvents(visible);
      const eventIds = visible.map((e) => e.id);
      if (eventIds.length) {
        const { data } = await supabase
          .from("auctions")
          .select("event_id, auction_type")
          .in("event_id", eventIds);
        const map: Record<string, AuctionType> = {};
        for (const row of (data ?? []) as { event_id: string | null; auction_type: AuctionType }[]) {
          if (row.event_id && !map[row.event_id]) map[row.event_id] = row.auction_type;
        }
        setTypesByEvent(map);
      }
      setLoading(false);
    };
    void load();
  }, [filter, isVendeurOnly]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Événements d'enchères
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Chaque événement regroupe plusieurs voitures. Enchérissez sur celles qui vous intéressent.
        </p>
      </header>

      <div className="mb-6 inline-flex rounded-lg border border-border bg-card p-1">
        <TabBtn active={filter === "live"} onClick={() => navigate({ to: "/events", search: { filter: "live" } })}>
          En cours / À venir
        </TabBtn>
        <TabBtn active={filter === "closed"} onClick={() => navigate({ to: "/events", search: { filter: "closed" } })}>
          Terminés
        </TabBtn>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">Aucun événement pour l'instant.</p>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((ev) => (
            <li key={ev.id}>
              <Link
                to="/events/$eventId"
                params={{ eventId: ev.id }}
                className="block overflow-hidden rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={[
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                      ev.status === "live"
                        ? "bg-destructive text-destructive-foreground"
                        : ev.status === "scheduled"
                          ? "bg-accent/15 text-accent"
                          : "bg-secondary text-secondary-foreground",
                    ].join(" ")}
                  >
                    {ev.status === "live" ? "EN DIRECT" : ev.status === "scheduled" ? "PROGRAMMÉ" : "TERMINÉ"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <CarIcon className="h-3.5 w-3.5" /> {ev.lotIds.length} voitures
                  </span>
                </div>
                <div className="mt-2">
                  <span
                    className={[
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                      typesByEvent[ev.id] === "fermee"
                        ? "bg-primary/15 text-primary"
                        : "bg-accent/15 text-accent",
                    ].join(" ")}
                  >
                    {typesByEvent[ev.id] === "fermee" ? "Enchère fermée" : "Enchère ouverte"}
                  </span>
                </div>
                <h2 className="mt-3 text-lg font-bold text-foreground">{ev.title}</h2>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {formatDateTime(ev.startsAt)}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm">
                  <span className="text-muted-foreground">
                    {ev.status === "scheduled" ? "Démarre dans" : ev.status === "live" ? "Termine dans" : "Terminé"}
                  </span>
                  {ev.status !== "closed" && ev.status !== "validated" && ev.status !== "cancelled" && (
                    <Countdown endsAt={ev.status === "scheduled" ? ev.startsAt : ev.endsAt} compact />
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
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
