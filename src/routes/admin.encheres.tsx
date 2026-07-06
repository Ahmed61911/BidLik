import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { X, Layers } from "lucide-react";
import { toast } from "sonner";
import { supabaseAdminApi } from "@/lib/supabaseAdminApi";
import { api } from "@/lib/api";
import type { Auction, AuctionEvent, Car } from "@/types/auction";
import { formatMad, listingPriceTier, priceTierTextClass } from "@/lib/format";
import { Countdown } from "@/components/Countdown";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/admin/encheres")({
  component: AdminCreateAuctionPage,
});

type ReadyCar = Car & { proprietaireId: string; noteFinale: number };

function AdminCreateAuctionPage() {
  const [cars, setCars] = useState<ReadyCar[]>([]);
  const [liveAuctions, setLiveAuctions] = useState<Auction[]>([]);
  const [events, setEvents] = useState<AuctionEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMultiDialog, setShowMultiDialog] = useState(false);

  const refresh = () => {
    setLoading(true);
    Promise.all([
      supabaseAdminApi.listExpertiseReady(),
      api.listAuctions("live"),
      api.listEvents("live"),
    ]).then(([c, a, ev]) => {
      setCars(c);
      setLiveAuctions(a);
      setEvents(ev);
      setLoading(false);
    });
  };
  useEffect(refresh, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-foreground">Créer une enchère</h2>
          <p className="text-xs text-muted-foreground">
            Seules les voitures expertisées (rapport reçu) peuvent être mises en enchère.
          </p>
        </div>
        <button
          onClick={() => setShowMultiDialog(true)}
          disabled={cars.length === 0}
          className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
        >
          <Layers className="h-4 w-4 shrink-0" />
          <span className="truncate">Événement multi-voitures</span>
        </button>
      </div>

      {events.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h3 className="mb-2 text-sm font-semibold text-foreground">Événements en cours / programmés</h3>
          <ul className="divide-y divide-border">
            {events.map((ev) => (
              <li key={ev.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-foreground">{ev.title}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    ID : {ev.id} · {ev.lotIds.length} voitures · {ev.status === "live" ? "EN DIRECT" : "Programmé"}
                  </p>
                </div>
                <Link
                  to="/events/$eventId"
                  params={{ eventId: ev.id }}
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  Voir
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : cars.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">
            Aucune voiture expertisée disponible. Assignez d'abord un expert depuis l'onglet Experts.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {cars.map((c) => (
            <li key={c.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-foreground"><span className="font-mono text-primary">#{c.id}</span> — {c.marque} {c.modele} ({c.annee})</p>
                  <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">ID : {c.id}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Vendeur : {c.vendeurNom}</p>
                </div>
                <span className="shrink-0 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
                  Note {c.noteFinale}/10
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span>{c.kilometrage.toLocaleString("fr-MA")} km</span>
                <span>Prix plancher : {formatMad(c.prixPlancher)}</span>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Sélectionnable dans un événement multi-voitures ci-dessus.
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="pt-4">
        <h2 className="text-lg font-semibold text-foreground">Enchères en cours</h2>
        <p className="text-xs text-muted-foreground">Suivi en temps réel des enchères actives.</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : liveAuctions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">Aucune enchère en cours.</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="space-y-2 md:hidden">
            {liveAuctions.map((a) => {
              const scheduled = a.status === "scheduled";
              return (
                <li key={a.id} className="rounded-xl border border-border bg-card p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      <span className="font-mono text-primary">#{a.car.id}</span> — {a.car.marque} {a.car.modele} ({a.car.annee})
                    </p>
                    <span className={["shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", scheduled ? "bg-accent/15 text-accent" : "bg-success/15 text-success"].join(" ")}>
                      {scheduled ? "Programmée" : "En cours"}
                    </span>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div><p className="text-[10px] uppercase text-muted-foreground">Départ</p><p className="font-medium tabular-nums">{formatMad(a.startingPrice)}</p></div>
                    <div><p className="text-[10px] uppercase text-muted-foreground">Actuel</p><p className={`font-semibold tabular-nums ${priceTierTextClass(listingPriceTier(a.currentPrice, a.car))}`}>{formatMad(a.currentPrice)}</p></div>
                    <div><p className="text-[10px] uppercase text-muted-foreground">Démarrage</p><p className="text-muted-foreground">{new Date(a.startsAt).toLocaleString("fr-MA", { dateStyle: "short", timeStyle: "short" })}</p></div>
                    <div><p className="text-[10px] uppercase text-muted-foreground">Fin dans</p><Countdown endsAt={a.endsAt} compact /></div>
                  </div>
                  <Link to="/auctions/$auctionId" params={{ auctionId: a.id }} className="mt-2 inline-block text-xs font-semibold text-accent hover:underline">Voir l'enchère →</Link>
                </li>
              );
            })}
          </ul>

          <div className="hidden rounded-xl border border-border bg-card shadow-sm md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Voiture</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Prix de départ</TableHead>
                  <TableHead className="text-right">Prix actuel</TableHead>
                  <TableHead className="text-right">Démarrage</TableHead>
                  <TableHead className="text-right">Fin dans</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {liveAuctions.map((a) => {
                  const scheduled = a.status === "scheduled";
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">{a.id}</TableCell>
                      <TableCell className="font-medium text-foreground">
                        <span className="font-mono text-primary">#{a.car.id}</span> — {a.car.marque} {a.car.modele} ({a.car.annee})
                      </TableCell>
                      <TableCell>
                        <span
                          className={[
                            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                            scheduled
                              ? "bg-accent/15 text-accent"
                              : "bg-success/15 text-success",
                          ].join(" ")}
                        >
                          {scheduled ? "Programmée" : "En cours"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {a.auctionType === "fermee" ? (
                          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">
                            🔒 Enveloppe fermée
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatMad(a.startingPrice)}</TableCell>
                      <TableCell className={`text-right tabular-nums font-semibold ${priceTierTextClass(listingPriceTier(a.currentPrice, a.car))}`}>{formatMad(a.currentPrice)}</TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {new Date(a.startsAt).toLocaleString("fr-MA", { dateStyle: "short", timeStyle: "short" })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Countdown endsAt={a.endsAt} compact />
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          to="/auctions/$auctionId"
                          params={{ auctionId: a.id }}
                          className="text-xs font-semibold text-accent hover:underline"
                        >
                          Voir
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {showMultiDialog && (
        <MultiCarEventDialog
          cars={cars}
          onClose={() => setShowMultiDialog(false)}
          onCreated={() => {
            setShowMultiDialog(false);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function MultiCarEventDialog({
  cars,
  onClose,
  onCreated,
}: {
  cars: ReadyCar[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const navigate = useNavigate();
  const [title, setTitle] = useState(`Vente du ${new Date().toLocaleDateString("fr-MA")}`);
  const [durationHours, setDurationHours] = useState(24);
  const [scheduleNow, setScheduleNow] = useState(true);
  const [startsAt, setStartsAt] = useState(() => {
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setSeconds(0, 0);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  const [auctionType, setAuctionType] = useState<"ouverte" | "fermee">("ouverte");
  const [selected, setSelected] = useState<Record<string, { picked: boolean; price: number; minAccepted: number }>>(
    () =>
      Object.fromEntries(
        cars.map((c) => [
          c.id,
          {
            picked: false,
            price: c.prixMinimum ?? 0,
            minAccepted: c.prixMinimum ?? 0,
          },
        ]),
      ),
  );
  const [saving, setSaving] = useState(false);

  const pickedCount = useMemo(
    () => Object.values(selected).filter((s) => s.picked).length,
    [selected],
  );

  function toggle(id: string) {
    setSelected((prev) => ({ ...prev, [id]: { ...prev[id], picked: !prev[id].picked } }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const pickedCars = cars.filter((c) => selected[c.id]?.picked);
    const missing = pickedCars.find((c) => c.prixMinimum == null);
    if (missing) {
      toast.error(`${missing.marque} ${missing.modele} : prix minimum manquant sur la fiche voiture`);
      return;
    }
    const items = pickedCars.map((c) => ({
      carId: c.id,
      startingPrice: c.prixMinimum!,
      minimumAcceptedPrice: auctionType === "fermee" ? c.prixMinimum! : undefined,
    }));
    if (items.length === 0) {
      toast.error("Sélectionnez au moins une voiture");
      return;
    }
    let startsAtIso: string | undefined;
    if (!scheduleNow) {
      const t = new Date(startsAt).getTime();
      if (!Number.isFinite(t) || t <= Date.now()) {
        toast.error("Date de démarrage invalide");
        return;
      }
      startsAtIso = new Date(t).toISOString();
    }
    setSaving(true);
    try {
      const ev = await supabaseAdminApi.createMultiCarEvent({
        title,
        durationHours,
        startsAt: startsAtIso,
        visibility: auctionType === "fermee" ? "ferme" : "ouvert",
        auctionType,
        items,
      });
      toast.success(`Événement créé avec ${items.length} voitures`);
      onCreated();
      navigate({ to: "/events/$eventId", params: { eventId: ev.id } });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="flex w-full max-w-2xl flex-col rounded-t-2xl bg-card shadow-xl sm:max-h-[90vh] sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h3 className="text-lg font-semibold text-foreground">Nouvel événement multi-voitures</h3>
          <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={submit} className="flex flex-1 flex-col overflow-hidden">
          <div className="space-y-3 overflow-y-auto p-5">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">Titre de l'événement</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">Durée (heures)</span>
                <input
                  type="number"
                  min={1}
                  max={168}
                  value={durationHours}
                  onChange={(e) => setDurationHours(+e.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </label>
              <fieldset className="rounded-md border border-border p-2">
                <legend className="px-1 text-xs font-medium text-muted-foreground">Format</legend>
                <div className="flex gap-2">
                  {(["ouverte", "fermee"] as const).map((v) => (
                    <label
                      key={v}
                      className={[
                        "flex flex-1 cursor-pointer items-center justify-center rounded-md border px-2 py-1.5 text-xs font-medium",
                        auctionType === v ? "border-accent bg-accent/10 text-accent" : "border-border text-muted-foreground",
                      ].join(" ")}
                    >
                      <input type="radio" checked={auctionType === v} onChange={() => setAuctionType(v)} className="sr-only" />
                      {v === "ouverte" ? "Ouverte (live)" : "🔒 Enveloppe fermée"}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>


            {auctionType === "fermee" && (
              <div className="rounded-md border border-accent/40 bg-accent/5 p-3 text-xs text-foreground">
                🔒 <strong>Enveloppe fermée</strong> — les acheteurs soumettent des offres confidentielles. Définissez un prix minimum accepté par voiture ci-dessous.
              </div>
            )}

            <fieldset className="rounded-md border border-border p-3">
              <legend className="px-1 text-xs font-medium text-muted-foreground">Démarrage</legend>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={scheduleNow} onChange={() => setScheduleNow(true)} />
                  Démarrer immédiatement
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={!scheduleNow} onChange={() => setScheduleNow(false)} />
                  Programmer
                </label>
                {!scheduleNow && (
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  />
                )}
              </div>
            </fieldset>

            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Voitures à inclure ({pickedCount} sélectionnée{pickedCount > 1 ? "s" : ""})
              </p>
              <ul className="space-y-2">
                {cars.map((c) => {
                  const s = selected[c.id];
                  return (
                    <li
                      key={c.id}
                      className={[
                        "rounded-lg border p-3 transition-colors",
                        s?.picked ? "border-accent bg-accent/5" : "border-border bg-background",
                      ].join(" ")}
                    >
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={s?.picked ?? false}
                          onChange={() => toggle(c.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">
                            <span className="font-mono text-primary">#{c.id}</span> — {c.marque} {c.modele} ({c.annee})
                          </p>
                          <p className="font-mono text-[11px] text-muted-foreground">ID : {c.id}</p>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-md border border-border bg-muted/30 px-2 py-1">
                              <span className="block text-[10px] uppercase text-muted-foreground">Prix plancher</span>
                              <span className="font-semibold tabular-nums text-foreground">
                                {formatMad(c.prixPlancher)}
                              </span>
                            </div>
                            <div className="rounded-md border border-border bg-muted/30 px-2 py-1">
                              <span className="block text-[10px] uppercase text-muted-foreground">Prix départ (minimum)</span>
                              <span className="font-semibold tabular-nums text-foreground">
                                {c.prixMinimum != null ? formatMad(c.prixMinimum) : "—"}
                              </span>
                            </div>
                          </div>
                          {c.prixMinimum == null && (
                            <p className="mt-1 text-[11px] text-destructive">
                              ⚠ Renseignez le prix minimum dans la fiche voiture avant de créer l'enchère.
                            </p>
                          )}
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border p-5">
            <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-secondary">
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving || pickedCount === 0}
              className="inline-flex items-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Création…" : `Créer l'événement (${pickedCount})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
