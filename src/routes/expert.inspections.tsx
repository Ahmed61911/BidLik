import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabaseExpertApi } from "@/lib/supabaseExpertApi";
import type { ExpertInspection } from "@/types/expert";

export const Route = createFileRoute("/expert/inspections")({
  component: ExpertInspectionsLayout,
});

function ExpertInspectionsLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (path !== "/expert/inspections") return <Outlet />;
  return <ExpertInspectionsPage />;
}

function ExpertInspectionsPage() {
  const [items, setItems] = useState<ExpertInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "en_inspection" | "rapport_recu">("en_inspection");

  useEffect(() => {
    supabaseExpertApi.listInspections().then((i) => {
      setItems(i);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? items : items.filter((i) => i.stage === filter)),
    [items, filter],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Inspections</h2>
          <p className="text-xs text-muted-foreground">{items.length} dossiers au total</p>
        </div>
        <div className="flex gap-1 rounded-md border border-border bg-card p-1">
          {(["en_inspection", "rapport_recu", "all"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={[
                "rounded px-3 py-1 text-xs font-medium transition-colors",
                filter === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary",
              ].join(" ")}
            >
              {k === "en_inspection" ? "À inspecter" : k === "rapport_recu" ? "Terminées" : "Toutes"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">Aucune inspection.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((i) => (
            <li key={i.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-foreground"><span className="font-mono text-primary">#{i.carId}</span> — {i.carLabel}</p>
                    <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-[11px] text-foreground">ID: {i.carId}</span>
                    {i.stage === "rapport_recu" ? (
                      <span className="inline-flex rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
                        Note {i.noteFinale}/10
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning-foreground">
                        À inspecter
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {i.vendeurNom} · {i.ville} · {i.kilometrage.toLocaleString("fr-MA")} km · assigné le {i.assigneLe}
                    {i.stage === "en_inspection" ? ` · échéance ${i.echeance}` : ` · rapport ${i.rapportRecuLe}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    to="/expert/inspections/$inspectionId"
                    params={{ inspectionId: i.id }}
                    className="inline-flex h-9 items-center rounded-md bg-accent px-3 text-sm font-semibold text-accent-foreground hover:opacity-90"
                  >
                    {i.stage === "en_inspection" ? "Remplir le rapport" : "Voir le rapport"}
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
