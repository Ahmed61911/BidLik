import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabaseVendeurApi } from "@/lib/supabaseVendeurApi";
import type { SellerCar } from "@/types/vendeur";
import { formatMad, priceTier, priceTierTextClass, type PriceTier } from "@/lib/format";
import { STAGE_LABEL, STAGE_TONE } from "./vendeur.index";
import { Dropdown } from "@/components/ui/dropdown";

export const Route = createFileRoute("/vendeur/voitures")({
  component: VendeurCarsPage,
});

function VendeurCarsPage() {
  const [cars, setCars] = useState<SellerCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<SellerCar["stage"] | "all">("all");

  const refresh = () => {
    setLoading(true);
    supabaseVendeurApi.listCars().then((c) => {
      setCars(c);
      setLoading(false);
    });
  };
  useEffect(refresh, []);

  const filtered = useMemo(
    () => (filter === "all" ? cars : cars.filter((c) => c.stage === filter)),
    [cars, filter],
  );


  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">{cars.length} véhicules au total</p>
        <Dropdown
          value={filter}
          onChange={(v) => setFilter(v as SellerCar["stage"] | "all")}
          ariaLabel="Filtrer par statut"
          className="sm:w-56"
          size="sm"
          options={[
            { value: "all", label: "Tous les statuts" },
            ...Object.entries(STAGE_LABEL).map(([v, l]) => ({ value: v, label: l })),
          ]}
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">Aucune voiture pour ce filtre.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((c) => {
            const courant = c.prixCourant ?? c.prixFinal ?? 0;
            const tier = courant > 0 ? priceTier(courant, c.prixAttendu) : undefined;
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
                      {c.noteExpert !== null && (
                        <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                          Note {c.noteExpert}/10
                        </span>
                      )}
                    </div>
                    <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                      <Info label="Kilométrage" value={`${c.kilometrage.toLocaleString("fr-MA")} km`} />
                      <Info label="Prix attendu" value={formatMad(c.prixAttendu)} />
                      <Info
                        label="Prix actuel"
                        value={courant > 0 ? formatMad(courant) : "—"}
                        tier={tier}
                      />
                      <Info label="Expert" value={c.expertNom ?? "Non assigné"} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Soumise le {c.soumisLe}
                      {c.acheteurNom ? ` · acheteur ${c.acheteurNom}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {c.auctionId && (
                      <Link
                        to="/auctions/$auctionId"
                        params={{ auctionId: c.auctionId }}
                        className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-background px-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
                      >
                        {c.stage === "en_enchere" ? "👁️ Suivre l'enchère" : "Voir l'enchère"}
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
