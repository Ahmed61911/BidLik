import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { FileText, Upload, X } from "lucide-react";

import { toast } from "sonner";
import {
  useMesPaiements,
  signedPaymentProofUrl,
  listMyPendingPaymentAuctions,
  uploadBuyerProof,
  submitBuyerPayment,
  type PendingPaymentAuction,
} from "@/lib/supabaseAcheteurStore";
import { formatMad } from "@/lib/format";
import { DeadlineCountdown } from "@/components/DeadlineCountdown";
import { supabase } from "@/integrations/supabase/client";

async function openProof(path: string) {
  try {
    const url = await signedPaymentProofUrl(path);
    window.open(url, "_blank", "noopener,noreferrer");
  } catch (e) {
    toast.error((e as Error).message);
  }
}

export const Route = createFileRoute("/acheteur/paiements")({
  component: PaiementsPage,
});

const TYPE_LABEL: Record<string, string> = {
  all: "Tous types",
  achat: "Achat",
  caution: "Caution",
  commission: "Commission",
  remboursement: "Remboursement",
  virement_vendeur: "Virement vendeur",
};

const STATUS_LABEL: Record<string, string> = {
  all: "Tous statuts",
  en_attente: "En attente",
  regle: "Validée",
  rembourse: "Remboursé",
  rejete: "Refusée",
};

function PaiementsPage() {
  const paiements = useMesPaiements();
  const [pending, setPending] = useState<PendingPaymentAuction[]>([]);
  const [submitting, setSubmitting] = useState<PendingPaymentAuction | null>(null);

  // Filters
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");

  const resetFilters = () => {
    setQuery("");
    setTypeFilter("all");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setAmountMin("");
    setAmountMax("");
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = amountMin ? Number(amountMin) : null;
    const max = amountMax ? Number(amountMax) : null;
    const from = dateFrom ? new Date(dateFrom).getTime() : null;
    const to = dateTo ? new Date(dateTo).getTime() + 24 * 60 * 60 * 1000 - 1 : null;
    return [...paiements]
      .filter((p) => {
        if (typeFilter !== "all" && p.type !== typeFilter) return false;
        if (statusFilter !== "all" && p.status !== statusFilter) return false;
        if (min != null && p.montant < min) return false;
        if (max != null && p.montant > max) return false;
        const t = new Date(p.date).getTime();
        if (from != null && t < from) return false;
        if (to != null && t > to) return false;
        if (q) {
          const hay = `${p.libelle} ${p.reference} ${p.type} ${p.notes ?? ""} ${p.bank ?? ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [paiements, query, typeFilter, statusFilter, dateFrom, dateTo, amountMin, amountMax]);


  const refreshPending = () => {
    listMyPendingPaymentAuctions()
      .then(setPending)
      .catch((e) => toast.error((e as Error).message));
  };
  useEffect(() => {
    refreshPending();
    const ch = supabase
      .channel("buyer-payments-pending")
      .on("postgres_changes", { event: "*", schema: "public", table: "auctions" }, refreshPending)
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, refreshPending);
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const totalEnVerification = pending
    .filter((p) => p.paymentStatus === "en_attente")
    .reduce((s, p) => s + p.prixFinal, 0);
  const totalDu = pending
    .filter((p) => p.paymentStatus !== "en_attente" && p.paymentStatus !== "paye")
    .reduce((s, p) => s + p.prixFinal, 0);
  const totalRegle = paiements
    .filter((p) => p.type === "achat" && p.status === "regle")
    .reduce((s, p) => s + p.montant, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <Card label="Solde dû" value={formatMad(totalDu)} tone={totalDu > 0 ? "warn" : undefined} />
        <Card label="En attente de vérification" value={formatMad(totalEnVerification)} tone={totalEnVerification > 0 ? "info" : undefined} />
        <Card label="Total réglé" value={formatMad(totalRegle)} tone="ok" />
      </div>

      {/* À régler (48h) */}
      {pending.length > 0 && (
        <section className="rounded-xl border-2 border-amber-200 bg-amber-50/50 p-4 shadow-sm sm:rounded-2xl sm:p-5 dark:bg-amber-950/20">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              À régler — 48h après validation
            </h3>
          </div>
          <ul className="space-y-3">
            {pending.map((p) => {
              const isPending = p.paymentStatus === "en_attente";
              const isPaid = p.paymentStatus === "paye";
              return (
                <li
                  key={p.auctionId}
                  className="rounded-lg border border-border bg-background p-3 sm:p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground">
                        {p.marque} {p.modele} <span className="text-muted-foreground">({p.annee})</span>
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Prix final · <span className="font-bold text-foreground">{formatMad(p.prixFinal)}</span>
                      </p>
                      <div className="mt-2">
                        <DeadlineCountdown deadline={p.paymentDeadline} label="Délai paiement" />
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {isPaid ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                          Paiement validé
                        </span>
                      ) : isPending ? (
                        <>
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900">
                            En vérification admin
                          </span>
                          <button
                            onClick={() => setSubmitting(p)}
                            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-semibold hover:bg-secondary"
                          >
                            Remplacer
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setSubmitting(p)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
                        >
                          <Upload className="h-4 w-4" /> Soumettre le paiement
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:rounded-2xl sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Filtres</h3>
          <button
            onClick={resetFilters}
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Réinitialiser
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Recherche</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Libellé, référence, banque…"
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
            >
              {Object.keys(TYPE_LABEL).map((t) => (
                <option key={t} value={t}>{TYPE_LABEL[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Statut</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
            >
              {Object.keys(STATUS_LABEL).map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Période</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 flex-1 rounded-md border border-border bg-background px-2 text-sm"
              />
              <span className="text-xs text-muted-foreground">à</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 flex-1 rounded-md border border-border bg-background px-2 text-sm"
              />
            </div>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Montant (DH)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={amountMin}
                onChange={(e) => setAmountMin(e.target.value)}
                placeholder="Min"
                className="h-9 flex-1 rounded-md border border-border bg-background px-2 text-sm"
              />
              <span className="text-xs text-muted-foreground">à</span>
              <input
                type="number"
                value={amountMax}
                onChange={(e) => setAmountMax(e.target.value)}
                placeholder="Max"
                className="h-9 flex-1 rounded-md border border-border bg-background px-2 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:rounded-2xl sm:p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Historique complet</h3>
          <span className="text-xs text-muted-foreground">{filtered.length} paiement{filtered.length > 1 ? "s" : ""}</span>
        </div>
        {filtered.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Aucun paiement.</p>
        ) : (
          <>
            <div className="mt-3 space-y-3 sm:hidden">
              {filtered.map((p) => (
                <article key={p.id} className="rounded-lg border border-border bg-background p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs capitalize text-muted-foreground">
                        {p.type.replace("_", " ")}
                      </p>
                      <p className="mt-0.5 font-semibold leading-snug text-foreground">{p.libelle}</p>
                      <p className="mt-1 font-mono text-[11px] text-muted-foreground">{p.reference}</p>
                    </div>
                    <Badge status={p.status} />
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">
                      {new Date(p.date).toLocaleDateString("fr-MA")}
                    </span>
                    <span className="font-semibold text-foreground">{formatMad(p.montant)}</span>
                  </div>
                  {p.proofUrl && (
                    <button
                      onClick={() => openProof(p.proofUrl!)}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      {p.proofName ?? "Voir preuve"}
                    </button>
                  )}
                </article>
              ))}
            </div>
            <div className="mt-3 hidden overflow-x-auto sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Libellé</th>
                    <th className="py-2 pr-3">Référence</th>
                    <th className="py-2 pr-3 text-right">Montant</th>
                    <th className="py-2 pr-3 text-right">Statut</th>
                    <th className="py-2 text-right">Preuve</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((p) => (
                    <tr key={p.id}>
                      <td className="py-3 pr-3 text-muted-foreground">
                        {new Date(p.date).toLocaleDateString("fr-MA")}
                      </td>
                      <td className="py-3 pr-3 capitalize text-muted-foreground">
                        {p.type.replace("_", " ")}
                      </td>
                      <td className="py-3 pr-3 font-medium text-foreground">{p.libelle}</td>
                      <td className="py-3 pr-3 font-mono text-xs text-muted-foreground">
                        {p.reference}
                      </td>
                      <td className="py-3 pr-3 text-right font-semibold text-foreground">
                        {formatMad(p.montant)}
                      </td>
                      <td className="py-3 pr-3 text-right">
                        <Badge status={p.status} />
                      </td>
                      <td className="py-3 text-right">
                        {p.proofUrl ? (
                          <button
                            onClick={() => openProof(p.proofUrl!)}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            {p.proofName ?? "Voir"}
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>


      {submitting && (
        <SubmitPaymentDialog
          item={submitting}
          onClose={() => setSubmitting(null)}
          onSaved={() => {
            setSubmitting(null);
            refreshPending();
          }}
        />
      )}
    </div>
  );
}

function SubmitPaymentDialog({
  item,
  onClose,
  onSaved,
}: {
  item: PendingPaymentAuction;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(item.prixFinal);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<string>("virement");
  const [bank, setBank] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!file) return toast.error("Veuillez joindre un justificatif (PDF ou image)");
    if (!amount || amount <= 0) return toast.error("Montant invalide");
    if (!reference.trim()) return toast.error("Référence du virement requise");
    if (paymentMethod === "cheque" && !dueDate)
      return toast.error("Date d'échéance du chèque requise");
    setSaving(true);
    try {
      const up = await uploadBuyerProof(file, item.carId);
      await submitBuyerPayment({
        auctionId: item.auctionId,
        amount,
        reference: reference.trim(),
        proofUrl: up.path,
        proofName: up.name,
        notes,
        paymentMethod,
        bank: bank.trim() || null,
        dueDate: paymentMethod === "cheque" ? dueDate : null,
      });
      toast.success("Paiement soumis — en attente de vérification");
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Soumettre le paiement</h3>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {item.marque} {item.modele} ({item.annee}) — {formatMad(item.prixFinal)}
        </p>
        <div className="mt-2">
          <DeadlineCountdown deadline={item.paymentDeadline} label="Délai restant" />
        </div>

        <div className="mt-4 space-y-3">
          <Field label="Montant payé (DH)">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
            />
          </Field>
          <Field label="Mode de paiement">
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
            >
              <option value="virement">Virement bancaire</option>
              <option value="cheque">Chèque</option>
              <option value="especes">Espèces</option>
              <option value="carte">Carte bancaire</option>
              <option value="autre">Autre</option>
            </select>
          </Field>
          <Field label="Référence du virement / chèque">
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="VIR-2026-..."
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
            />
          </Field>
          <Field label="Banque">
            <input
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              placeholder="Attijariwafa, BMCE, CIH…"
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
            />
          </Field>
          {paymentMethod === "cheque" && (
            <Field label="Date d'échéance du chèque">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
              />
            </Field>
          )}
          <Field label="Notes (optionnel)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            />
          </Field>
          <Field label="Justificatif (PDF, image)">
            <label className="flex h-20 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border bg-background text-sm text-muted-foreground hover:bg-secondary/50">
              <Upload className="h-4 w-4" />
              {file ? file.name : "Choisir un fichier"}
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </label>
          </Field>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="h-9 rounded-md border border-border px-3 text-sm hover:bg-secondary"
          >
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="h-9 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Envoi…" : "Soumettre"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function Card({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" | "info" }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:rounded-2xl sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={[
          "mt-2 text-xl font-bold leading-tight sm:text-2xl",
          tone === "warn"
            ? "text-destructive"
            : tone === "ok"
              ? "text-emerald-600"
              : tone === "info"
                ? "text-amber-600"
                : "text-foreground",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}


function Badge({ status }: { status: "en_attente" | "regle" | "rembourse" | "rejete" }) {
  const map = {
    en_attente: { label: "En attente", cls: "bg-amber-100 text-amber-800" },
    regle: { label: "Validée", cls: "bg-emerald-100 text-emerald-800" },
    rembourse: { label: "Remboursé", cls: "bg-secondary text-secondary-foreground" },
    rejete: { label: "Refusée", cls: "bg-destructive/15 text-destructive" },
  } as const;
  const m = map[status];
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${m.cls}`}>{m.label}</span>
  );
}
