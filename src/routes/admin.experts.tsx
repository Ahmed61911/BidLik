import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabaseAdminApi } from "@/lib/supabaseAdminApi";
import type { Expert, ExpertAssignment } from "@/types/admin";
import { Dropdown } from "@/components/ui/dropdown";

export const Route = createFileRoute("/admin/experts")({
  component: AdminExpertsPage,
});

function AdminExpertsPage() {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [assignments, setAssignments] = useState<ExpertAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    Promise.all([supabaseAdminApi.listExperts(), supabaseAdminApi.listAssignments()]).then(([e, a]) => {
      setExperts(e);
      setAssignments(a);
      setLoading(false);
    });
  };
  useEffect(refresh, []);

  const unassigned = useMemo(() => assignments.filter((a) => a.status === "non_assigne"), [assignments]);
  const inProgress = useMemo(() => assignments.filter((a) => a.status === "en_inspection"), [assignments]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Experts</h2>
        <p className="text-xs text-muted-foreground">Gérer les inspections et assigner les experts aux nouveaux véhicules.</p>
      </div>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-foreground">À assigner ({unassigned.length})</h3>
        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : unassigned.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Aucune inspection en attente.</p>
        ) : (
          <ul className="space-y-2">
            {unassigned.map((a) => (
              <li key={a.id} className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-foreground"><span className="font-mono text-primary">#{a.carId}</span> — {a.carLabel}</p>
                <div className="flex items-center gap-2">
                  <Dropdown
                    value=""
                    placeholder="Choisir un expert…"
                    ariaLabel="Choisir un expert"
                    className="w-full sm:w-72"
                    size="sm"
                    onChange={async (expertId) => {
                      if (!expertId) return;
                      try {
                        await supabaseAdminApi.assignExpert(a.carId, expertId);
                        toast.success("Expert assigné");
                        refresh();
                      } catch (err) {
                        toast.error((err as Error).message);
                      }
                    }}
                    options={experts
                      .filter((ex) => ex.actif)
                      .map((ex) => ({
                        value: ex.id,
                        label: `${ex.nom} — ${ex.ville} (${ex.inspectionsEnCours} en cours)`,
                      }))}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Inspections en cours ({inProgress.length})</h3>
        {inProgress.length === 0 ? (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Aucune inspection en cours.</p>
        ) : (
          <ul className="space-y-2">
            {inProgress.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-md border border-border p-3">
                <div>
                  <p className="text-sm font-medium text-foreground"><span className="font-mono text-primary">#{a.carId}</span> — {a.carLabel}</p>
                  <p className="text-xs text-muted-foreground">Assigné à {a.expertNom} · le {a.assigneLe}</p>
                </div>
                <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[11px] font-semibold text-warning-foreground">En inspection</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card shadow-sm">
        <h3 className="border-b border-border px-4 py-3 text-sm font-semibold text-foreground">Tous les experts</h3>
        {/* Mobile cards */}
        <ul className="divide-y divide-border md:hidden">
          {experts.map((ex) => (
            <li key={ex.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{ex.nom}</p>
                  <p className="text-xs text-muted-foreground truncate">{ex.email}</p>
                  <p className="text-xs text-muted-foreground">{ex.ville}</p>
                </div>
                <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${ex.actif ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                  {ex.actif ? "Actif" : "Inactif"}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <div><p className="text-[10px] uppercase text-muted-foreground">En cours</p><p className="font-medium">{ex.inspectionsEnCours}</p></div>
                <div><p className="text-[10px] uppercase text-muted-foreground">Total</p><p className="font-medium">{ex.inspectionsTotal}</p></div>
                <div><p className="text-[10px] uppercase text-muted-foreground">Note</p><p className="font-medium">{ex.noteMoyenne.toFixed(1)}/10</p></div>
              </div>
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Ville</th>
                <th className="px-4 py-3">En cours</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Note moyenne</th>
                <th className="px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {experts.map((ex) => (
                <tr key={ex.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{ex.nom}</p>
                    <p className="text-xs text-muted-foreground">{ex.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{ex.ville}</td>
                  <td className="px-4 py-3">{ex.inspectionsEnCours}</td>
                  <td className="px-4 py-3">{ex.inspectionsTotal}</td>
                  <td className="px-4 py-3 font-semibold">{ex.noteMoyenne.toFixed(1)} / 10</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${ex.actif ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                      {ex.actif ? "Actif" : "Inactif"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
