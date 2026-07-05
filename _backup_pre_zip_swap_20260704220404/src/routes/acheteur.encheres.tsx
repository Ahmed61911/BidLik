import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMesEncheres } from "@/lib/supabaseAcheteurStore";
import { formatMad, buyerPriceTier, buyerPriceTierTextClass } from "@/lib/format";
import { Countdown } from "@/components/Countdown";
import type { EnchereStatus } from "@/types/acheteur";

export const Route = createFileRoute("/acheteur/encheres")({
  component: MesEncheresPage,
});

const TABS: { key: "all" | EnchereStatus; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "active", label: "Actives" },
  { key: "en_attente_validation", label: "En attente" },
  { key: "gagnee", label: "Remportées" },
  { key: "perdue", label: "Perdues" },
];

function MesEncheresPage() {
  const encheres = useMesEncheres();
  const [tab, setTab] = useState<"all" | EnchereStatus>("all");

  const list = tab === "all" ? encheres : encheres.filter((e) => e.status === tab);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {TABS.map((t) => {
          const count =
            t.key === "all" ? encheres.length : encheres.filter((e) => e.status === t.key).length;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={[
                "min-w-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary",
              ].join(" ")}
            >
              {t.label} <span className="ml-1 opacity-75">({count})</span>
            </button>
          );
        })}
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Aucune enchère dans cette catégorie.{" "}
          <Link to="/auctions" className="font-semibold text-accent hover:underline">
            Découvrir les enchères
          </Link>
        </div>
      ) : (
        <ul className="grid gap-3">
          {list.map((e) => (
            <li
              key={e.auctionId}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">
                    {e.marque} {e.modele}{" "}
                    <span className="font-normal text-muted-foreground">({e.annee})</span>
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    Mon offre :{" "}
                    <span className="font-semibold text-foreground">{formatMad(e.monMontant)}</span>
                    {" · "}
                    Prix actuel :{" "}
                    <span
                      className={`font-semibold ${buyerPriceTierTextClass(buyerPriceTier(e.prixActuel, e.prixAttendu))}`}
                    >
                      {formatMad(e.prixActuel)}
                    </span>
                  </p>
                </div>
                <StatusBadge status={e.status} leader={e.jeSuisLeader} />
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3 text-xs">
                {e.status === "active" ? (
                  <span className="text-muted-foreground">
                    Fin : <Countdown endsAt={e.endsAt} compact />
                  </span>
                ) : (
                  <span className="text-muted-foreground">Terminée</span>
                )}
                <Link
                  to="/acheteur/encherir/$auctionId"
                  params={{ auctionId: e.auctionId }}
                  className="font-semibold text-accent hover:underline"
                >
                  {e.status === "active" ? "Enchérir →" : "Voir l'enchère →"}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ status, leader }: { status: EnchereStatus; leader: boolean }) {
  if (status === "active") {
    return leader ? <Badge tone="ok">En tête</Badge> : <Badge tone="warn">Surenchéri</Badge>;
  }
  if (status === "en_attente_validation") return <Badge tone="info">En attente validation</Badge>;
  if (status === "gagnee") return <Badge tone="ok">Remportée</Badge>;
  return <Badge tone="muted">Perdue</Badge>;
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "ok" | "warn" | "info" | "muted";
}) {
  const cls = {
    ok: "bg-emerald-100 text-emerald-800",
    warn: "bg-destructive/10 text-destructive",
    info: "bg-amber-100 text-amber-800",
    muted: "bg-muted text-muted-foreground",
  }[tone];
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>
      {children}
    </span>
  );
}
