import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabaseExpertApi } from "@/lib/supabaseExpertApi";
import type { ExpertInspection } from "@/types/expert";

export const Route = createFileRoute("/expert/historique")({
  component: ExpertHistoryPage,
});

function noteColor(n: number) {
  if (n >= 7) return "text-success";
  if (n >= 5) return "text-warning-foreground";
  return "text-destructive";
}

function ExpertHistoryPage() {
  const [items, setItems] = useState<ExpertInspection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabaseExpertApi.listInspections().then((i) => {
      setItems(i.filter((x) => x.stage === "rapport_recu"));
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Historique des rapports</h2>
        <p className="text-xs text-muted-foreground">{items.length} rapports soumis.</p>
      </div>

      {/* Mobile: card list */}
      <div className="space-y-3 sm:hidden">
        {loading && (
          <div className="rounded-xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
            Chargement…
          </div>
        )}
        {!loading && items.length === 0 && (
          <div className="rounded-xl border border-border bg-card px-4 py-10 text-center text-sm text-muted-foreground">
            Aucun rapport.
          </div>
        )}
        {items.map((i) => (
          <div
            key={i.id}
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-mono text-primary">#{i.carId}</div>
                <div className="truncate text-sm font-semibold text-foreground">
                  {i.carLabel}
                </div>
              </div>
              <div className={`shrink-0 text-base font-bold ${noteColor(i.noteFinale ?? 0)}`}>
                {i.noteFinale}/10
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {i.vendeurNom} · {i.ville}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Soumis le {i.rapportRecuLe}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop/tablet: table */}
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card shadow-sm sm:block">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Voiture</th>
              <th className="px-4 py-3">Vendeur</th>
              <th className="px-4 py-3">Note</th>
              <th className="px-4 py-3">Soumis le</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">Chargement…</td></tr>}
            {!loading && items.length === 0 && <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">Aucun rapport.</td></tr>}
            {items.map((i) => (
              <tr key={i.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium text-foreground"><span className="font-mono text-primary">#{i.carId}</span> — {i.carLabel}</td>
                <td className="px-4 py-3 text-muted-foreground">{i.vendeurNom} · {i.ville}</td>
                <td className="px-4 py-3">
                  <span className={`font-bold ${noteColor(i.noteFinale ?? 0)}`}>
                    {i.noteFinale}/10
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{i.rapportRecuLe}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
