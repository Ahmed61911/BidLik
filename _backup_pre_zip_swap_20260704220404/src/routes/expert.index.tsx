import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ClipboardCheck, CalendarClock, Star, FileCheck } from "lucide-react";
import { supabaseExpertApi } from "@/lib/supabaseExpertApi";
import type { ExpertInspection, ExpertStats } from "@/types/expert";

export const Route = createFileRoute("/expert/")({
  component: ExpertOverviewPage,
});

function ExpertOverviewPage() {
  const [stats, setStats] = useState<ExpertStats | null>(null);
  const [inspections, setInspections] = useState<ExpertInspection[]>([]);

  useEffect(() => {
    Promise.all([supabaseExpertApi.getStats(), supabaseExpertApi.listInspections()]).then(([s, i]) => {
      setStats(s);
      setInspections(i);
    });
  }, []);

  const enCours = inspections
    .filter((i) => i.stage === "en_inspection")
    .sort((a, b) => a.echeance.localeCompare(b.echeance));

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="En cours" value={stats?.enCours ?? "—"} icon={ClipboardCheck} tone="accent" />
        <Kpi label="Rapports" value={stats?.rapportsCeMois ?? "—"} icon={FileCheck} tone="success" />
        <Kpi
          label="Note moyenne"
          value={stats ? `${stats.noteMoyenneDonnee}/10` : "—"}
          icon={Star}
        />
        <Kpi
          label="Prochaine échéance"
          value={stats?.prochaineEcheance ?? "—"}
          icon={CalendarClock}
          tone="warning"
        />
      </div>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Inspections en cours</h2>
          <Link to="/expert/inspections" className="text-xs font-medium text-accent hover:underline">
            Tout voir →
          </Link>
        </div>
        {enCours.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">Aucune inspection en cours. 🎉</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {enCours.slice(0, 5).map((i) => (
              <li key={i.id} className="flex items-center justify-between rounded-md border border-border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground"><span className="font-mono text-primary">#{i.carId}</span> — {i.carLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    {i.vendeurNom} · {i.ville} · échéance {i.echeance}
                  </p>
                </div>
                <Link
                  to="/expert/inspections/$inspectionId"
                  params={{ inspectionId: i.id }}
                  className="ml-3 inline-flex h-8 shrink-0 items-center rounded-md bg-accent px-3 text-xs font-semibold text-accent-foreground hover:opacity-90"
                >
                  Inspecter
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
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
  icon: typeof ClipboardCheck;
  tone?: "accent" | "success" | "warning";
}) {
  const toneCls =
    tone === "accent"
      ? "text-accent"
      : tone === "success"
      ? "text-success"
      : tone === "warning"
      ? "text-warning-foreground"
      : "text-foreground";
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
