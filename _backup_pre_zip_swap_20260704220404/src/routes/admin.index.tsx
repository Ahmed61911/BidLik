import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity, Car as CarIcon, ClipboardCheck, TrendingUp, Users, Wallet, ArrowUpRight,
} from "lucide-react";
import { supabaseAdminApi } from "@/lib/supabaseAdminApi";
import type { AdminStats, PendingValidation, RevenuePoint } from "@/types/admin";
import { formatMad, formatMadShort, buyerPriceTier, buyerPriceTierTextClass } from "@/lib/format";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

function AdminOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [pending, setPending] = useState<PendingValidation[]>([]);

  useEffect(() => {
    Promise.all([
      supabaseAdminApi.getStats(),
      supabaseAdminApi.getRevenue(),
      supabaseAdminApi.listPendingValidations(),
    ]).then(([s, r, p]) => {
      setStats(s);
      setRevenue(r);
      setPending(p);
    });
  }, []);

  const maxCa = Math.max(1, ...revenue.map((r) => r.ca));

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={<Activity className="h-4 w-4" />}
          label="Enchères en cours"
          value={stats ? stats.liveAuctions.toString() : "—"}
          hint={stats ? `${stats.totalAuctions} au total` : ""}
          tone="accent"
        />
        <Kpi
          icon={<TrendingUp className="h-4 w-4" />}
          label="Ventes validées (mois)"
          value={stats ? stats.ventesValideesMois.toString() : "—"}
          hint={stats ? `Conversion ${(stats.tauxConversion * 100).toFixed(0)} %` : ""}
        />
        <Kpi
          icon={<Wallet className="h-4 w-4" />}
          label="Total ventes validées"
          value={stats ? formatMadShort(stats.totalVentesValidees) : "—"}
          hint={stats ? `${formatMadShort(stats.caMois)} de commission (mois)` : ""}
        />
        <Kpi
          icon={<Wallet className="h-4 w-4" />}
          label="Total ventes encaissé"
          value={stats ? formatMadShort(stats.totalVentesEncaissees) : "—"}
          hint=""
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Chiffre d'affaires — 30 jours</h2>
              <p className="text-xs text-muted-foreground">Commission Bidlik en MAD</p>
            </div>
            <span className="text-xs text-muted-foreground">
              Total : {formatMad(revenue.reduce((s, r) => s + r.ca, 0))}
            </span>
          </div>
          <div className="flex h-44 items-end gap-1">
            {revenue.map((r) => (
              <div key={r.date} className="group flex h-full flex-1 flex-col justify-end" title={`${r.date} — ${formatMad(r.ca)}`}>
                <div
                  className="w-full rounded-t-sm bg-accent/20 transition-colors group-hover:bg-accent"
                  style={{ height: `${(r.ca / maxCa) * 100}%` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
            <span>{revenue[0]?.date}</span>
            <span>{revenue[revenue.length - 1]?.date}</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">État de la plateforme</h2>
              <p className="text-xs text-muted-foreground">Répartition & indicateurs clés</p>
            </div>
            <Link to="/admin/validations" className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
              Détails <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {stats && (() => {
            const userMax = Math.max(1, stats.acheteursActifs, stats.vendeursActifs, stats.experts);
            const bars = [
              { label: "Acheteurs", value: stats.acheteursActifs, color: "bg-accent" },
              { label: "Vendeurs", value: stats.vendeursActifs, color: "bg-primary" },
              { label: "Experts", value: stats.experts, color: "bg-emerald-500" },
            ];
            return (
              <>
                <div className="space-y-2.5">
                  {bars.map((b) => (
                    <div key={b.label}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{b.label}</span>
                        <span className="font-semibold text-foreground tabular-nums">
                          {b.value.toLocaleString("fr-MA")}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className={`h-full rounded-full ${b.color} transition-all`}
                          style={{ width: `${(b.value / userMax) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4 text-xs">
                  <Metric label="Taux conversion" value={`${(stats.tauxConversion * 100).toFixed(0)} %`} />
                  <Metric label="Validations en attente" value={stats.enchersValidationsEnAttente.toString()} />
                  <Metric label="Enchères live" value={stats.liveAuctions.toString()} />
                  <Metric label="Total enchères" value={stats.totalAuctions.toLocaleString("fr-MA")} />
                </div>
              </>
            );
          })()}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <ShortcutCard to="/admin/voitures" icon={<CarIcon className="h-5 w-5" />} title="Gérer les voitures" desc="Créer, éditer, supprimer." />
        <ShortcutCard to="/admin/experts" icon={<ClipboardCheck className="h-5 w-5" />} title="Assigner experts" desc="Inspections en attente." />
        <ShortcutCard to="/admin/utilisateurs" icon={<Users className="h-5 w-5" />} title="Utilisateurs & cautions" desc="Activer / désactiver." />
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, hint, tone }: { icon: React.ReactNode; label: string; value: string; hint?: string; tone?: "accent" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={tone === "accent" ? "text-accent" : "text-muted-foreground"}>{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ShortcutCard({ to, icon, title, desc }: { to: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all hover:border-accent hover:shadow-md"
    >
      <span className="rounded-lg bg-secondary p-2 text-foreground">{icon}</span>
      <span className="flex-1">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
      <ArrowUpRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-secondary/60 px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-foreground tabular-nums">{value}</p>
    </div>
  );
}
