import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { History, CheckCircle2, XCircle, TrendingUp } from "lucide-react";
import { supabaseVendeurApi } from "@/lib/supabaseVendeurApi";
import type { SellerCar, SellerPayout } from "@/types/vendeur";
import { formatMad } from "@/lib/format";
import { STAGE_LABEL, STAGE_TONE } from "./vendeur.index";

export const Route = createFileRoute("/vendeur/historique")({
  component: VendeurHistoriquePage,
});

const PAST_STAGES: SellerCar["stage"][] = ["vendu", "annulee"];

function VendeurHistoriquePage() {
  const [cars, setCars] = useState<SellerCar[]>([]);
  const [payouts, setPayouts] = useState<SellerPayout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([supabaseVendeurApi.listCars(), supabaseVendeurApi.listPayouts()]).then(([c, p]) => {
      setCars(c);
      setPayouts(p);
      setLoading(false);
    });
  }, []);

  const past = useMemo(
    () =>
      cars
        .filter((c) => PAST_STAGES.includes(c.stage))
        .sort((a, b) => (a.soumisLe < b.soumisLe ? 1 : -1)),
    [cars],
  );

  const ventes = past.filter((c) => c.stage === "vendu");
  const totalVentes = ventes.reduce((s, c) => s + (c.prixFinal ?? 0), 0);
  const totalPayouts = payouts
    .filter((p) => p.status === "vire")
    .reduce((s, p) => s + p.net, 0);

  return (
    <div className="space-y-5">

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Ventes finalisées" value={ventes.length} icon={CheckCircle2} tone="success" />
        <Kpi label="CA brut total" value={formatMad(totalVentes)} icon={TrendingUp} />
        <Kpi label="Net versé" value={formatMad(totalPayouts)} icon={TrendingUp} tone="success" />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : past.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <History className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Aucun historique pour le moment.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {past.map((c) => {
            const isVendu = c.stage === "vendu";
            const Icon = isVendu ? CheckCircle2 : XCircle;
            return (
              <li key={c.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Icon className={`h-4 w-4 ${isVendu ? "text-success" : "text-destructive"}`} />
                      <p className="text-base font-semibold text-foreground">
                        <span className="font-mono text-primary">#{c.id}</span> — {c.marque} {c.modele} ({c.annee})
                      </p>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${STAGE_TONE[c.stage]}`}>
                        {STAGE_LABEL[c.stage]}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
                      <Info label="Prix attendu" value={formatMad(c.prixAttendu)} />
                      <Info
                        label="Prix final"
                        value={c.prixFinal ? formatMad(c.prixFinal) : "—"}
                        tone={isVendu ? "success" : undefined}
                      />
                      <Info label="Acheteur" value={c.acheteurNom ?? "—"} />
                      <Info label="Date" value={c.soumisLe} />
                    </div>
                  </div>
                  {c.auctionId && (
                    <Link
                      to="/auctions/$auctionId"
                      params={{ auctionId: c.auctionId }}
                      className="inline-flex h-9 shrink-0 items-center rounded-md border border-border bg-background px-3 text-sm font-semibold text-foreground hover:bg-secondary"
                    >
                      Voir l'enchère
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {payouts.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Versements</h3>
          <ul className="divide-y divide-border">
            {payouts.map((p) => (
              <li key={p.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground"><span className="font-mono text-primary">#{p.carId}</span> — {p.carLabel}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {p.date} · commission {formatMad(p.commission)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      p.status === "vire"
                        ? "bg-success/15 text-success"
                        : p.status === "en_attente"
                        ? "bg-warning/15 text-warning-foreground"
                        : "bg-destructive/15 text-destructive"
                    }`}
                  >
                    {p.status === "vire" ? "Versé" : p.status === "en_attente" ? "En attente" : "Annulé"}
                  </span>
                  <p className="text-base font-bold text-foreground">{formatMad(p.net)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: typeof History;
  tone?: "success";
}) {
  const toneCls = tone === "success" ? "text-success" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Icon className={`h-4 w-4 ${toneCls}`} />
      </div>
      <p className={`text-xl font-bold ${toneCls}`}>{value}</p>
    </div>
  );
}

function Info({ label, value, tone }: { label: string; value: string; tone?: "success" }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-0.5 font-medium ${tone === "success" ? "text-success" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}
