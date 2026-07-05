import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarClock, Car as CarIcon } from "lucide-react";
import { api } from "@/lib/api";
import { Countdown } from "@/components/Countdown";
import { TimeProgressBar } from "@/components/TimeProgressBar";
import { LotCard } from "@/components/LotCard";
import { formatDateTime } from "@/lib/format";
import { requireRole } from "@/lib/routeGuard";
import { useAuth } from "@/lib/auth";
import { supabaseVendeurApi } from "@/lib/supabaseVendeurApi";
import type { Auction } from "@/types/auction";

export const Route = createFileRoute("/events/$eventId")({
  beforeLoad: ({ location }) => requireRole(["acheteur", "admin", "vendeur"], location.href),
  loader: ({ params }) => api.getEvent(params.eventId),
  head: ({ loaderData }) => {
    const t = loaderData?.event.title ?? "Événement";
    return {
      meta: [
        { title: `${t} — Bidlik` },
        { name: "description", content: "Vente multi-voitures avec enchères indépendantes par lot." },
      ],
    };
  },
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Une erreur est survenue</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
        >
          Réessayer
        </button>
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">Événement introuvable</h1>
      <Link to="/events" className="mt-4 inline-block text-accent hover:underline">← Retour aux événements</Link>
    </div>
  ),
  component: EventDetailPage,
});

function EventDetailPage() {
  const { event, lots } = Route.useLoaderData();
  const { hasRole } = useAuth();
  const isVendeurOnly = hasRole("vendeur") && !hasRole("admin");
  const [visibleLots, setVisibleLots] = useState<Auction[]>(lots);

  useEffect(() => {
    if (!isVendeurOnly) {
      setVisibleLots(lots);
      return;
    }
    void supabaseVendeurApi.listCars().then((myCars) => {
      const mine = new Set(myCars.map((c) => c.auctionId).filter((x): x is string => !!x));
      setVisibleLots(lots.filter((l: Auction) => mine.has(l.id)));
    });
  }, [lots, isVendeurOnly]);

  const isLive = event.status === "live";
  const isScheduled = event.status === "scheduled";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Link to="/events" className="text-sm text-muted-foreground hover:text-foreground">
        ← Retour aux événements
      </Link>

      <header className="relative mt-4 overflow-hidden rounded-3xl bg-white text-neutral-900 shadow-xl shadow-emerald-900/5 ring-1 ring-neutral-200 dark:bg-neutral-900 dark:text-white dark:shadow-2xl dark:shadow-emerald-900/10 dark:ring-white/5">
        {/* Background accent layers */}
        <div
          className={[
            "pointer-events-none absolute inset-0 opacity-70 dark:opacity-60",
            isLive
              ? "bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_60%)]"
              : isScheduled
              ? "bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_60%)]"
              : "bg-[radial-gradient(circle_at_top_left,rgba(148,163,184,0.1),transparent_60%)]",
          ].join(" ")}
        />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-[100px]" />

        {/* Integrated thin progress bar at bottom */}
        {(isLive || isScheduled) && (
          <div className="absolute bottom-0 left-0 right-0 h-1.5">
            <TimeProgressBar
              startsAt={event.startsAt}
              endsAt={isScheduled ? event.startsAt : event.endsAt}
              className="!rounded-none"
            />
          </div>
        )}

        <div className="relative z-10 flex flex-col gap-8 p-6 sm:p-8 md:flex-row md:items-center md:justify-between md:p-10">
          {/* Left: primary info */}
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className={[
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider shadow-sm",
                  isLive
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                    : isScheduled
                    ? "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400"
                    : "border-neutral-300 bg-neutral-100 text-neutral-600 dark:border-neutral-600/40 dark:bg-neutral-700/30 dark:text-neutral-300",
                ].join(" ")}
              >
                {isLive && (
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                )}
                {isLive ? "EN DIRECT" : isScheduled ? "PROGRAMMÉ" : "TERMINÉ"}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-700 dark:border-neutral-700/50 dark:bg-neutral-800/50 dark:text-neutral-300">
                <CarIcon className="h-3.5 w-3.5" /> {visibleLots.length} voitures
              </span>
              {event.visibility === "ferme" && (
                <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
                  🔒 Enveloppe fermée
                </span>
              )}
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white sm:text-4xl">
              {event.title}
            </h1>

            <p className="flex items-center gap-2.5 text-sm font-medium text-neutral-600 dark:text-neutral-400">
              <CalendarClock className="h-4 w-4 opacity-70" />
              <span>
                {formatDateTime(event.startsAt)}
                <span className="mx-2 text-neutral-400 dark:text-neutral-600">→</span>
                {formatDateTime(event.endsAt)}
              </span>
            </p>
          </div>

          {/* Right: countdown card */}
          {(isLive || isScheduled) && (
            <div className="relative flex min-w-[220px] flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50 p-5 shadow-inner backdrop-blur-md dark:border-white/5 dark:bg-neutral-800/40">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
                {isScheduled ? "Démarre dans" : "Termine dans"}
              </div>
              <Countdown
                endsAt={isScheduled ? event.startsAt : event.endsAt}
                className="!font-mono !text-3xl !font-black !tracking-tighter !text-neutral-900 dark:!text-white sm:!text-4xl"
              />
              {isLive && (
                <span className="absolute right-3 top-3 flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      <section className="mt-8">
        <h2 className="text-lg font-bold text-foreground">Voitures de cet événement</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Chaque voiture a son propre système d'enchères en temps réel.
        </p>
        {visibleLots.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border p-12 text-center">
            <p className="text-sm text-muted-foreground">
              {isVendeurOnly ? "Aucune de vos voitures dans cet événement." : "Aucune voiture dans cet événement."}
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visibleLots.map((lot) => (
              <LotCard key={lot.id} auction={lot} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
