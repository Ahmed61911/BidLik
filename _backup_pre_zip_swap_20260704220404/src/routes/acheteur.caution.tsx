import { createFileRoute, useSearch, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { CheckCircle2, AlertCircle, Shield, Clock, XCircle, FileText } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { formatMad } from "@/lib/format";
import { useMesPaiements, signedPaymentProofUrl } from "@/lib/supabaseAcheteurStore";
import type { PaiementStatus } from "@/types/acheteur";
import { toast } from "sonner";

export const Route = createFileRoute("/acheteur/caution")({
  validateSearch: (s: Record<string, unknown>) => ({
    cmi: s.cmi === "ok" || s.cmi === "fail" ? (s.cmi as "ok" | "fail") : undefined,
  }),
  component: CautionPage,
});

const CAUTION_AMOUNT = 5000;

function CautionPage() {
  const { user } = useAuth();
  const validated = user?.cautionValidee ?? false;
  const paiements = useMesPaiements();
  const cautionPaiements = paiements.filter((p) => p.type === "caution");
  const latestCaution = cautionPaiements[0];
  const hasPending = !validated && cautionPaiements.some((p) => p.status === "en_attente");
  const wasRejected = !validated && !hasPending && latestCaution?.status === "rejete";
  const { cmi } = useSearch({ from: "/acheteur/caution" });

  useEffect(() => {
    if (cmi === "ok") toast.success("Paiement reçu. Validation en cours…");
    else if (cmi === "fail") toast.error("Paiement échoué ou annulé.");
  }, [cmi]);

  const openProof = async (path: string) => {
    try {
      const url = await signedPaymentProofUrl(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const state = validated
    ? {
        icon: <CheckCircle2 className="h-6 w-6" />,
        wrap: "bg-emerald-100 text-emerald-700",
        title: "Caution validée",
        badge: (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
            <Shield className="h-3.5 w-3.5" /> Active
          </span>
        ),
      }
    : hasPending
      ? {
          icon: <Clock className="h-6 w-6" />,
          wrap: "bg-amber-100 text-amber-800",
          title: "En attente de validation",
          badge: (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
              <Clock className="h-3.5 w-3.5" /> En attente
            </span>
          ),
        }
      : wasRejected
        ? {
            icon: <XCircle className="h-6 w-6" />,
            wrap: "bg-destructive/10 text-destructive",
            title: "Caution refusée",
            badge: null,
          }
        : {
            icon: <AlertCircle className="h-6 w-6" />,
            wrap: "bg-destructive/10 text-destructive",
            title: "Caution requise",
            badge: null,
          };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:rounded-2xl sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className={["flex h-12 w-12 shrink-0 items-center justify-center rounded-full", state.wrap].join(" ")}>
            {state.icon}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold leading-tight text-foreground">{state.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Une caution remboursable de{" "}
              <span className="font-semibold text-foreground">{formatMad(CAUTION_AMOUNT)}</span> est
              nécessaire pour participer aux enchères. Elle vous est restituée intégralement si vous
              ne remportez aucune enchère.
            </p>
            <div className="mt-3">
              {validated ? (
                state.badge
              ) : hasPending ? (
                <>
                  {state.badge}
                  <p className="mt-2 text-xs text-muted-foreground">
                    Votre justificatif a bien été reçu. Un administrateur va vérifier le paiement — vous serez notifié dès validation.
                  </p>
                </>
              ) : (
                <>
                  <Link
                    to="/acheteur/caution-paiement"
                    className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90"
                  >
                    {wasRejected ? "Soumettre un nouveau justificatif" : "Déposer ma caution"}
                  </Link>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Virement, chèque ou espèces — validation manuelle par un administrateur. Paiement par carte bientôt disponible.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:rounded-2xl sm:p-5">
        <h3 className="text-sm font-semibold text-foreground">Historique des cautions</h3>
        {cautionPaiements.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Aucun dépôt de caution.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {cautionPaiements.map((p) => (
              <li key={p.id} className="rounded-lg border border-border bg-background p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">Dépôt de caution</p>
                      <PayStatusBadge status={p.status} />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Soumis le {new Date(p.date).toLocaleString("fr-MA")}
                    </p>
                    <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                      {p.paymentMethod && (
                        <div className="flex gap-1">
                          <dt className="text-muted-foreground">Mode&nbsp;:</dt>
                          <dd className="font-medium capitalize text-foreground">{p.paymentMethod}</dd>
                        </div>
                      )}
                      {p.bank && (
                        <div className="flex gap-1">
                          <dt className="text-muted-foreground">Banque&nbsp;:</dt>
                          <dd className="font-medium text-foreground">{p.bank}</dd>
                        </div>
                      )}
                      {p.reference && (
                        <div className="flex gap-1">
                          <dt className="text-muted-foreground">Référence&nbsp;:</dt>
                          <dd className="font-mono font-medium text-foreground">{p.reference}</dd>
                        </div>
                      )}
                    </dl>
                    {p.notes && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Note :</span> {p.notes}
                      </p>
                    )}
                    {p.proofUrl && (
                      <button
                        onClick={() => openProof(p.proofUrl!)}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        {p.proofName ?? "Voir le justificatif"}
                      </button>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-bold text-foreground">{formatMad(p.montant)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function PayStatusBadge({ status }: { status: PaiementStatus }) {
  const map: Record<PaiementStatus, { label: string; cls: string }> = {
    en_attente: { label: "En attente", cls: "bg-amber-100 text-amber-900" },
    regle: { label: "Validée", cls: "bg-emerald-100 text-emerald-800" },
    rembourse: { label: "Remboursée", cls: "bg-secondary text-secondary-foreground" },
    rejete: { label: "Refusée", cls: "bg-destructive/15 text-destructive" },
  };
  const m = map[status];
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${m.cls}`}>{m.label}</span>
  );
}
