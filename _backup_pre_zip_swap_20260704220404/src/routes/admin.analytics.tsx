import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabaseAdminApi } from "@/lib/supabaseAdminApi";
import type { AdminStats, RevenuePoint } from "@/types/admin";
import { formatMad, formatMadShort } from "@/lib/format";

export const Route = createFileRoute("/admin/analytics")({
  component: AdminAnalyticsPage,
});

function AdminAnalyticsPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);

  useEffect(() => {
    Promise.all([supabaseAdminApi.getStats(), supabaseAdminApi.getRevenue()]).then(([s, r]) => {
      setStats(s);
      setRevenue(r);
    });
  }, []);

  const totalCa = revenue.reduce((s, r) => s + r.ca, 0);
  const totalVentes = revenue.reduce((s, r) => s + r.ventes, 0);
  const maxCa = Math.max(1, ...revenue.map((r) => r.ca));
  const maxVentes = Math.max(1, ...revenue.map((r) => r.ventes));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Analytics</h2>
        <p className="text-xs text-muted-foreground">Indicateurs globaux et tendances commerciales.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="GMV mois" value={stats ? formatMadShort(stats.volumeMois) : "—"} />
        <Stat label="Commission mois" value={stats ? formatMadShort(stats.caMois) : "—"} />
        <Stat label="Taux de conversion" value={stats ? `${(stats.tauxConversion * 100).toFixed(0)} %` : "—"} />
        <Stat label="Validations en attente" value={stats ? String(stats.enchersValidationsEnAttente) : "—"} />
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Commission journalière</h3>
            <p className="text-xs text-muted-foreground">{revenue.length} jours · total {formatMad(totalCa)}</p>
          </div>
        </div>
        <div className="flex h-52 items-end gap-1">
          {revenue.map((r) => (
            <div key={r.date} className="group flex h-full flex-1 flex-col justify-end" title={`${r.date} — ${formatMad(r.ca)}`}>
              <div className="w-full rounded-t-sm bg-accent/30 transition-colors group-hover:bg-accent" style={{ height: `${(r.ca / maxCa) * 100}%` }} />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Ventes journalières</h3>
            <p className="text-xs text-muted-foreground">Total {totalVentes} ventes</p>
          </div>
        </div>
        <div className="flex h-40 items-end gap-1">
          {revenue.map((r) => (
            <div key={r.date} className="group flex h-full flex-1 flex-col justify-end" title={`${r.date} — ${r.ventes} ventes`}>
              <div className="w-full rounded-t-sm bg-primary/40 transition-colors group-hover:bg-primary" style={{ height: `${(r.ventes / maxVentes) * 100}%` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
