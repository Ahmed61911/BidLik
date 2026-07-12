import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabaseAdminApi } from "@/lib/supabaseAdminApi";
import type { PendingValidation } from "@/types/admin";
import type { ProcessedValidation } from "@/lib/supabaseAdminApi";
import { formatMad } from "@/lib/format";
import { DeadlineCountdown } from "@/components/DeadlineCountdown";
import { usePagination } from "@/hooks/use-pagination";
import { ListPagination } from "@/components/ListPagination";

type ValidationTier = "low" | "mid" | "high";
function validationTier(prixFinal: number, prixPlancher: number): ValidationTier {
  if (prixFinal < prixPlancher - 5000) return "low";
  if (prixFinal > prixPlancher + 5000) return "high";
  return "mid";
}
function validationTierClass(tier: ValidationTier): string {
  if (tier === "low") return "text-destructive";
  if (tier === "high") return "text-success";
  return "text-warning";
}

export const Route = createFileRoute("/admin/validations")({
  component: AdminValidationsPage,
});

const RAISON_LABEL: Record<PendingValidation["raison"], string> = {
  ecart_prix: "Écart prix plancher",
  verification_paiement: "Vérification paiement",
  litige: "Litige",
  controle_qualite: "Contrôle qualité",
};

function AdminValidationsPage() {
  const [items, setItems] = useState<PendingValidation[]>([]);
  const [processed, setProcessed] = useState<ProcessedValidation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    Promise.all([
      supabaseAdminApi.listPendingValidations(),
      supabaseAdminApi.listProcessedValidations(),
    ])
      .then(([p, q]) => {
        setItems(p);
        setProcessed(q);
      })
      .catch((e) => toast.error((e as Error).message))
      .finally(() => setLoading(false));
  };
  useEffect(refresh, []);

  const decide = async (auctionId: string, decision: "validee" | "annulee") => {
    try {
      await supabaseAdminApi.validateAuction(auctionId, decision);
      toast.success(
        decision === "validee"
          ? "Enchère validée — l'acheteur dispose de 48h pour payer"
          : "Enchère annulée",
      );
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const pendingPage = usePagination(items, 10);
  const processedPage = usePagination(processed, 10);

  return (
    <div className="space-y-6">
      {/* SECTION 1 — Enchères à valider (24h admin) */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Enchères à valider (24h)</h2>
          <p className="text-xs text-muted-foreground">
            Validez ou rejetez chaque vente sous 24h après clôture. Au-delà, la vente est annulée
            automatiquement.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">Aucune enchère en attente. 🎉</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {pendingPage.pageItems.map((p) => {
              const ecart = p.prixFinal - p.prixPlancher;
              const ecartPct = (ecart / p.prixPlancher) * 100;
              const tier = validationTier(p.prixFinal, p.prixPlancher);
              return (
                <li key={p.auctionId} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-foreground">
                          <span className="font-mono text-primary">#{p.carId}</span> — {p.carLabel}
                        </p>
                        <span className="inline-flex rounded-full bg-accent/15 px-2 py-0.5 text-[11px] font-semibold text-accent">
                          {RAISON_LABEL[p.raison]}
                        </span>
                        <DeadlineCountdown deadline={p.adminValidationDeadline} label="Temps restant" />
                      </div>
                      <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                        <Info label="Vendeur" value={p.vendeurNom} />
                        <Info label="Acheteur" value={p.acheteurNom} />
                        <Info label="Prix final" value={formatMad(p.prixFinal)} tier={tier} />
                        <Info
                          label="Écart"
                          value={`${ecart >= 0 ? "+" : ""}${formatMad(ecart)} (${ecartPct.toFixed(1)} %)`}
                          tier={tier}
                        />
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Terminée {p.termineLe} · plancher {formatMad(p.prixPlancher)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => decide(p.auctionId, "annulee")}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-semibold text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-4 w-4" /> Rejeter
                      </button>
                      <button
                        onClick={() => decide(p.auctionId, "validee")}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-success px-3 text-sm font-semibold text-success-foreground shadow-sm hover:opacity-90"
                      >
                        <Check className="h-4 w-4" /> Valider
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <ListPagination page={pendingPage.page} pageCount={pendingPage.pageCount} onPageChange={pendingPage.setPage} />
      </section>

      {/* SECTION 2 — Historique : validées / rejetées + état de paiement */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Voitures validées / rejetées</h2>
          <p className="text-xs text-muted-foreground">
            Suivi des décisions récentes et de l'état de paiement des acheteurs.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : processed.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">Aucune décision pour le moment.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Voiture</th>
                  <th className="px-3 py-2 font-medium">Acheteur</th>
                  <th className="px-3 py-2 font-medium">Prix final</th>
                  <th className="px-3 py-2 font-medium">Décision</th>
                  <th className="px-3 py-2 font-medium">Paiement</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {processedPage.pageItems.map((p) => (
                  <tr key={p.auctionId} className="border-t border-border">
                    <td className="px-3 py-2">
                      <span className="font-mono text-xs text-primary">#{p.carId}</span>{" "}
                      <span className="text-foreground">{p.carLabel}</span>
                      <div className="text-xs text-muted-foreground">Vendeur : {p.vendeurNom}</div>
                    </td>
                    <td className="px-3 py-2 text-foreground">{p.acheteurNom}</td>
                    <td className="px-3 py-2 font-medium text-foreground">{formatMad(p.prixFinal)}</td>
                    <td className="px-3 py-2">
                      <DecisionBadge decision={p.decision} />
                    </td>
                    <td className="px-3 py-2">
                      {p.decision === "validee" ? (
                        <PaymentBadge status={p.paymentStatus} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {p.decideLe
                        ? new Date(p.decideLe).toLocaleString("fr-MA", { dateStyle: "short", timeStyle: "short" })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <ListPagination page={processedPage.page} pageCount={processedPage.pageCount} onPageChange={processedPage.setPage} />
      </section>

    </div>
  );
}

function DecisionBadge({ decision }: { decision: "validee" | "annulee" }) {
  const cls =
    decision === "validee"
      ? "bg-success/15 text-success"
      : "bg-destructive/15 text-destructive";
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {decision === "validee" ? "Validée" : "Rejetée"}
    </span>
  );
}

function PaymentBadge({ status }: { status: ProcessedValidation["paymentStatus"] }) {
  const map: Record<ProcessedValidation["paymentStatus"], { label: string; cls: string }> = {
    aucun: { label: "En attente", cls: "bg-warning/15 text-warning" },
    en_attente: { label: "À vérifier", cls: "bg-warning/15 text-warning" },
    paye: { label: "Payé", cls: "bg-success/15 text-success" },
    annule: { label: "Annulé", cls: "bg-destructive/15 text-destructive" },
    rembourse: { label: "Remboursé", cls: "bg-accent/15 text-accent" },
  };
  const m = map[status];
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${m.cls}`}>
      {m.label}
    </span>
  );
}

function Info({ label, value, tier }: { label: string; value: string; tier?: ValidationTier }) {
  const cls = tier ? validationTierClass(tier) : "text-foreground";
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-0.5 font-medium ${cls}`}>{value}</p>
    </div>
  );
}
