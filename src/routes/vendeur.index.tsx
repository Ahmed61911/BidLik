import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Car as CarIcon, Gavel, ClipboardCheck, TrendingUp } from "lucide-react";
import { supabaseVendeurApi } from "@/lib/supabaseVendeurApi";
import type { SellerStats, SellerCar } from "@/types/vendeur";
import { formatMad, priceTier, priceTierTextClass, priceTierBgClass } from "@/lib/format";

export const Route = createFileRoute("/vendeur/")({
  component: VendeurOverviewPage,
});

const STAGE_LABEL: Record<SellerCar["stage"], string> = {
  brouillon: "À assigner",
  en_inspection: "En inspection",
  rapport_recu: "Rapport reçu",
  en_enchere: "En enchère",
  en_attente_validation: "Attente validation",
  vendu: "Vendue",
  annulee: "Annulée",
};

const STAGE_TONE: Record<SellerCar["stage"], string> = {
  brouillon: "bg-muted text-muted-foreground",
  en_inspection: "bg-warning/15 text-warning-foreground",
  rapport_recu: "bg-accent/15 text-accent",
  en_enchere: "bg-success/15 text-success",
  en_attente_validation: "bg-warning/15 text-warning-foreground",
  vendu: "bg-success/15 text-success",
  annulee: "bg-destructive/15 text-destructive",
};

function VendeurOverviewPage() {
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [cars, setCars] = useState<SellerCar[]>([]);

  useEffect(() => {
    Promise.all([supabaseVendeurApi.getStats(), supabaseVendeurApi.listCars()]).then(([s, c]) => {
      setStats(s);
      setCars(c);
    });
  }, []);

  const live = cars.filter((c) => c.stage === "en_enchere");
  const closed = cars.filter((c) => c.stage === "vendu" || c.stage === "en_attente_validation");

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Voitures actives" value={stats?.voituresActives ?? "—"} icon={CarIcon} />
        <Kpi label="En inspection" value={stats?.enInspection ?? "—"} icon={ClipboardCheck} />
        <Kpi label="En enchère live" value={stats?.enEnchereLive ?? "—"} icon={Gavel} tone="accent" />
        <Kpi
          label="Net du mois"
          value={stats ? formatMad(stats.caNetMois) : "—"}
          icon={TrendingUp}
          tone="success"
        />
      </div>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Mes enchères en cours</h2>
          <Link to="/vendeur/voitures" className="text-xs font-medium text-accent hover:underline">
            Tout voir →
          </Link>
        </div>
        {live.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">Aucune voiture en enchère pour le moment.</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Les véhicules sont ajoutés et assignés par l'équipe Bidlik. Contactez votre référent pour confier une nouvelle voiture.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {live.map((c) => {
              const courant = c.prixCourant ?? 0;
              const pct = Math.min(100, Math.round((courant / c.prixAttendu) * 100));
              const tier = priceTier(courant, c.prixAttendu);
              const textCls = priceTierTextClass(tier);
              const bgCls = priceTierBgClass(tier);
              return (
                <li key={c.id} className="rounded-md border border-border p-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        <span className="font-mono text-primary">#{c.id}</span> — {c.marque} {c.modele} ({c.annee})
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.bidCount ?? 0} offres · attendu {formatMad(c.prixAttendu)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className={`text-base font-bold ${textCls}`}>
                        {formatMad(courant)}
                      </p>
                      {c.auctionId && (
                        <Link
                          to="/auctions/$auctionId"
                          params={{ auctionId: c.auctionId }}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-secondary"
                        >
                          👁️ Suivre
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full transition-all ${bgCls}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {closed.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Mes enchères terminées</h2>
          <ul className="space-y-2">
            {closed.map((c) => (
              <li key={c.id} className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    <span className="font-mono text-primary">#{c.id}</span> — {c.marque} {c.modele} ({c.annee})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {STAGE_LABEL[c.stage]} · {c.bidCount ?? 0} offres
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-base font-bold text-foreground">
                    {formatMad(c.prixFinal ?? c.prixCourant ?? 0)}
                  </p>
                  {c.auctionId && (
                    <Link
                      to="/auctions/$auctionId"
                      params={{ auctionId: c.auctionId }}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-secondary"
                    >
                      Voir
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {stats?.prochainPaiement && (
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-foreground">Prochain virement</h2>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Prévu le {stats.prochainPaiement}</p>
            <p className="text-lg font-bold text-success">{formatMad(stats.prochainPaiementMontant)}</p>
          </div>
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
  icon: typeof CarIcon;
  tone?: "accent" | "success";
}) {
  const toneCls =
    tone === "accent" ? "text-accent" : tone === "success" ? "text-success" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <Icon className={`h-4 w-4 ${toneCls}`} />
      </div>
      <p className={`text-2xl font-bold ${toneCls}`}>{value}</p>
    </div>
  );
}

export { STAGE_LABEL, STAGE_TONE };
