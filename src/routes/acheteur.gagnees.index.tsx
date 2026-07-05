import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trophy, Truck, CheckCircle2, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatMad } from "@/lib/format";
import { DeadlineCountdown } from "@/components/DeadlineCountdown";

export const Route = createFileRoute("/acheteur/gagnees/")({
  component: MesVoituresGagneesPage,
});

type WonRow = {
  auction_id: string;
  car_id: string;
  marque: string;
  modele: string;
  annee: number;
  prix_final: number;
  auction_status: "closed" | "validated" | "cancelled";
  car_status: string;
  payment_status: "non_paye" | "paye";
  delivery_status: "non_livre" | "livre";
  validated_at: string | null;
  payment_deadline: string | null;
  closed_at: string | null;
  updated_at: string;
};

type WonStatus = "en_attente" | "validee" | "livree" | "annulee";

function computeStatus(r: WonRow): WonStatus {
  if (r.auction_status === "cancelled" || r.car_status === "vendu_annulee") return "annulee";
  if (r.delivery_status === "livre") return "livree";
  if (r.auction_status === "validated") return "validee";
  return "en_attente";
}

const TABS: { key: "all" | WonStatus; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "en_attente", label: "En attente" },
  { key: "validee", label: "Validées" },
  { key: "livree", label: "Livrées" },
  { key: "annulee", label: "Annulées" },
];

function MesVoituresGagneesPage() {
  const [rows, setRows] = useState<WonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | WonStatus>("all");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      const { data, error } = await supabase.rpc("list_my_won_auctions");
      if (!alive) return;
      if (error) setErr(error.message);
      else setRows((data ?? []) as WonRow[]);
      setLoading(false);
    }
    void load();
    const ch = supabase
      .channel("acheteur-gagnees")
      .on("postgres_changes", { event: "*", schema: "public", table: "auctions" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "cars" }, () => void load())
      .subscribe();
    return () => {
      alive = false;
      void supabase.removeChannel(ch);
    };
  }, []);

  const withStatus = rows.map((r) => ({ ...r, _s: computeStatus(r) }));
  const counts: Record<WonStatus, number> = {
    en_attente: 0, validee: 0, livree: 0, annulee: 0,
  };
  withStatus.forEach((r) => { counts[r._s] += 1; });

  const list = tab === "all" ? withStatus : withStatus.filter((r) => r._s === tab);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {TABS.map((t) => {
          const count = t.key === "all" ? rows.length : counts[t.key];
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

      {err && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {err}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Chargement…
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Aucune voiture dans cette catégorie.
        </div>
      ) : (
        <ul className="grid gap-3">
          {list.map((r) => (
            <li
              key={r.auction_id}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-foreground">
                    <span className="font-mono text-primary">#{r.car_id}</span> — {r.marque} {r.modele}{" "}
                    <span className="font-normal text-muted-foreground">({r.annee})</span>
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    Prix final :{" "}
                    <span className="font-semibold text-foreground">{formatMad(r.prix_final)}</span>
                    {r.payment_status === "paye" && (
                      <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
                        Payée
                      </span>
                    )}
                  </p>
                </div>
                <StatusBadge status={r._s} />
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 text-xs">
                <div className="min-w-0 text-muted-foreground">
                  {r._s === "en_attente" && (
                    <span>En attente de la validation de l'administrateur.</span>
                  )}
                  {r._s === "validee" && r.payment_deadline && r.payment_status !== "paye" && (
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Paiement sous : <DeadlineCountdown deadline={r.payment_deadline} />
                    </span>
                  )}
                  {r._s === "validee" && r.payment_status === "paye" && (
                    <span>Paiement validé — en attente de livraison.</span>
                  )}
                  {r._s === "livree" && <span>Véhicule livré. Transaction terminée.</span>}
                  {r._s === "annulee" && <span>Cette vente a été annulée.</span>}
                </div>
                <div className="flex shrink-0 gap-3">
                  <Link
                    to="/acheteur/gagnees/$auctionId"
                    params={{ auctionId: r.auction_id }}
                    className="font-semibold text-accent hover:underline"
                  >
                    Voir les détails →
                  </Link>
                  {r._s === "validee" && r.payment_status !== "paye" && (
                    <Link
                      to="/acheteur/paiements"
                      className="font-semibold text-primary hover:underline"
                    >
                      Payer →
                    </Link>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: WonStatus }) {
  const map: Record<WonStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    en_attente: { label: "En attente", cls: "bg-amber-100 text-amber-800", icon: <Clock className="h-3 w-3" /> },
    validee: { label: "Validée", cls: "bg-blue-100 text-blue-800", icon: <CheckCircle2 className="h-3 w-3" /> },
    livree: { label: "Livrée", cls: "bg-emerald-100 text-emerald-800", icon: <Truck className="h-3 w-3" /> },
    annulee: { label: "Annulée", cls: "bg-muted text-muted-foreground", icon: <XCircle className="h-3 w-3" /> },
  };
  const s = map[status];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${s.cls}`}>
      {s.icon}
      {s.label}
    </span>
  );
}

// keep import used
void Trophy;
