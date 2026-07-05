import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Gavel, Eye, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { supabaseVendeurApi } from "@/lib/supabaseVendeurApi";
import type { SellerCar } from "@/types/vendeur";
import { formatMad, priceTier, priceTierTextClass, priceTierBgClass, type PriceTier } from "@/lib/format";
import { STAGE_LABEL, STAGE_TONE } from "./vendeur.index";

export const Route = createFileRoute("/vendeur/encheres")({
  component: VendeurEncheresPage,
});

const ACTIVE_STAGES: SellerCar["stage"][] = ["en_enchere", "en_attente_validation"];

function VendeurEncheresPage() {
  const [cars, setCars] = useState<SellerCar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabaseVendeurApi.listCars().then((c) => {
      setCars(c);
      setLoading(false);
    });
  }, []);

  const auctions = useMemo(
    () => cars.filter((c) => ACTIVE_STAGES.includes(c.stage) && c.auctionId),
    [cars],
  );

  const totalCourant = auctions.reduce((s, c) => s + (c.prixCourant ?? 0), 0);
  const totalAttendu = auctions.reduce((s, c) => s + c.prixAttendu, 0);

  return (
    <div className="space-y-5">

      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Enchères actives" value={auctions.length} icon={Gavel} tone="accent" />
        <Kpi label="Cumul prix courant" value={formatMad(totalCourant)} icon={TrendingUp} tone="success" />
        <Kpi label="Cumul prix attendu" value={formatMad(totalAttendu)} icon={Clock} />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : auctions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <Gavel className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            Aucune de vos voitures n'est actuellement en enchère.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {auctions.map((c) => {
            const courant = c.prixCourant ?? 0;
            const tier = priceTier(courant, c.prixAttendu);
            const sousAttente = tier !== "above";
            const pct = Math.min(100, Math.round((courant / c.prixAttendu) * 100));
            const Icon = sousAttente ? TrendingDown : TrendingUp;
            const bgCls = priceTierBgClass(tier);
            return (
              <li key={c.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-foreground">
                        <span className="font-mono text-primary">#{c.id}</span> — {c.marque} {c.modele} ({c.annee})
                      </p>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${STAGE_TONE[c.stage]}`}>
                        {STAGE_LABEL[c.stage]}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 font-mono text-[11px] text-secondary-foreground">
                        #{c.auctionId}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                      <Info label="Prix attendu" value={formatMad(c.prixAttendu)} />
                      <Info
                        label="Prix courant"
                        value={formatMad(courant)}
                        tier={tier}
                      />
                      <Info label="Offres" value={`${c.bidCount ?? 0}`} />
                    </div>
                    <div className="mt-3">
                      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                        <div
                          className={`h-full transition-all ${bgCls}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Icon className="h-3 w-3" />
                        {pct}% du prix attendu
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center">
                    {c.auctionId && (
                      <Link
                        to="/auctions/$auctionId"
                        params={{ auctionId: c.auctionId }}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-accent px-3 text-sm font-semibold text-accent-foreground hover:opacity-90"
                      >
                        <Eye className="h-4 w-4" /> Suivre
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
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
  icon: typeof Gavel;
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
      <p className={`text-xl font-bold ${toneCls}`}>{value}</p>
    </div>
  );
}

function Info({ label, value, tier }: { label: string; value: string; tier?: PriceTier }) {
  const cls = tier ? priceTierTextClass(tier) : "text-foreground";
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-0.5 font-medium ${cls}`}>
        {value}
      </p>
    </div>
  );
}
