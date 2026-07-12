import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, FileText, X, Upload, Check } from "lucide-react";
import { toast } from "sonner";
import { supabaseAdminApi } from "@/lib/supabaseAdminApi";
import {
  supabaseAdminPaiements,
  type AdminPayment,
  type AdminPaymentStatus,
  type AdminPaymentType,
} from "@/lib/supabaseAdminPaiements";
import type { AdminUser } from "@/types/admin";
import { formatMad } from "@/lib/format";
import { usePagination } from "@/hooks/use-pagination";
import { ListPagination } from "@/components/ListPagination";

export const Route = createFileRoute("/admin/paiements")({
  component: AdminPaiementsPage,
});

const TYPE_LABEL: Record<AdminPaymentType | "all", string> = {
  all: "Tous types",
  achat: "Paiement achat (acheteur)",
  virement_vendeur: "Virement vendeur",
  commission: "Commission",
  remboursement: "Remboursement",
  caution: "Caution",
};

const STATUS_LABEL: Record<AdminPaymentStatus, string> = {
  en_attente: "En attente",
  paye: "Payé",
  rembourse: "Remboursé",
  annule: "Annulé",
};

const STATUS_TONE: Record<AdminPaymentStatus, string> = {
  en_attente: "bg-amber-100 text-amber-900",
  paye: "bg-emerald-100 text-emerald-900",
  rembourse: "bg-secondary text-secondary-foreground",
  annule: "bg-destructive/15 text-destructive",
};

type PaymentDirection = "entrant" | "sortant";

const DIRECTION_BY_TYPE: Record<AdminPaymentType, PaymentDirection> = {
  achat: "entrant",
  caution: "entrant",
  commission: "entrant",
  virement_vendeur: "sortant",
  remboursement: "sortant",
};

const DIRECTION_LABEL: Record<PaymentDirection, string> = {
  entrant: "Entrant",
  sortant: "Sortant",
};

const DIRECTION_TONE: Record<PaymentDirection, string> = {
  entrant: "bg-emerald-100 text-emerald-900",
  sortant: "bg-orange-100 text-orange-900",
};

function beneficiaryOf(p: AdminPayment): string {
  switch (p.type) {
    case "virement_vendeur":
      return p.userNom ?? p.userEmail ?? "Vendeur";
    case "remboursement":
      return p.userNom ?? p.userEmail ?? "Acheteur";
    case "achat":
    case "caution":
    case "commission":
    default:
      return "Bidlik (plateforme)";
  }
}

function payerOf(p: AdminPayment): string {
  switch (p.type) {
    case "achat":
    case "caution":
      return p.userNom ?? p.userEmail ?? "Acheteur";
    case "commission":
      return "Bidlik (plateforme)";
    case "virement_vendeur":
    case "remboursement":
      return "Bidlik (plateforme)";
    default:
      return p.userNom ?? "—";
  }
}

function AdminPaiementsPage() {
  const [items, setItems] = useState<AdminPayment[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | AdminPaymentStatus>("all");
  const [directionFilter, setDirectionFilter] = useState<"all" | PaymentDirection>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | AdminPaymentType>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<AdminPayment | "new" | null>(null);

  const refresh = () => {
    setLoading(true);
    Promise.all([supabaseAdminPaiements.list(), supabaseAdminApi.listUsers()])
      .then(([p, u]) => {
        setItems(p);
        setUsers(u);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };
  useEffect(refresh, []);

  const filtered = useMemo(
    () =>
      items.filter((p) => {
        if (filter !== "all" && p.status !== filter) return false;
        if (directionFilter !== "all" && DIRECTION_BY_TYPE[p.type] !== directionFilter) return false;
        if (typeFilter !== "all" && p.type !== typeFilter) return false;
        if (userFilter !== "all" && p.userId !== userFilter) return false;
        if (dateFrom) {
          const d = new Date(p.paidAt ?? p.createdAt);
          if (d < new Date(dateFrom)) return false;
        }
        if (dateTo) {
          const d = new Date(p.paidAt ?? p.createdAt);
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          if (d > to) return false;
        }
        if (amountMin && p.amount < Number(amountMin)) return false;
        if (amountMax && p.amount > Number(amountMax)) return false;
        if (!query) return true;
        const q = query.toLowerCase();
        return (
          (p.userNom ?? "").toLowerCase().includes(q) ||
          (p.userEmail ?? "").toLowerCase().includes(q) ||
          (p.reference ?? "").toLowerCase().includes(q) ||
          (p.carLabel ?? "").toLowerCase().includes(q) ||
          beneficiaryOf(p).toLowerCase().includes(q) ||
          payerOf(p).toLowerCase().includes(q)
        );
      }),
    [items, filter, directionFilter, typeFilter, userFilter, dateFrom, dateTo, amountMin, amountMax, query],
  );

  const { page, setPage, pageCount, pageItems: pagedFiltered } = usePagination(filtered, 10);

  const resetFilters = () => {
    setFilter("all");
    setDirectionFilter("all");
    setTypeFilter("all");
    setUserFilter("all");
    setDateFrom("");
    setDateTo("");
    setAmountMin("");
    setAmountMax("");
    setQuery("");
  };

  const totals = useMemo(() => {
    const isAcheteur = (p: AdminPayment) => p.type === "achat" || p.type === "caution";
    const isVendeur = (p: AdminPayment) => p.type === "virement_vendeur";
    const sum = (pred: (p: AdminPayment) => boolean) =>
      items.filter(pred).reduce((s, p) => s + p.amount, 0);
    return {
      pendingAcheteur: sum((p) => isAcheteur(p) && p.status === "en_attente"),
      pendingVendeur: sum((p) => isVendeur(p) && p.status === "en_attente"),
      paidAcheteur: sum((p) => isAcheteur(p) && p.status === "paye"),
      paidVendeur: sum((p) => isVendeur(p) && p.status === "paye"),
    };
  }, [items]);

  const openProof = async (path: string) => {
    try {
      const url = await supabaseAdminPaiements.signedProofUrl(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const remove = async (p: AdminPayment) => {
    if (!confirm("Supprimer ce paiement ?")) return;
    try {
      await supabaseAdminPaiements.remove(p.id);
      if (p.proofUrl) await supabaseAdminPaiements.removeProof(p.proofUrl);
      toast.success("Paiement supprimé");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const setPayStatus = async (id: string, status: AdminPaymentStatus) => {
    try {
      await supabaseAdminPaiements.setStatus(id, status);
      toast.success(status === "paye" ? "Paiement validé" : "Paiement rejeté");
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const pendingBuyerPayments = useMemo(
    () => items.filter((p) => p.type === "achat" && p.status === "en_attente"),
    [items],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Paiements</h2>
          <p className="text-xs text-muted-foreground">
            Enregistrez et suivez tous les paiements (acheteurs & vendeurs) avec preuve de paiement.
          </p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Nouveau paiement
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            En attente
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Card label="Acheteur" value={formatMad(totals.pendingAcheteur)} tone="orange" />
            <Card label="Vendeur" value={formatMad(totals.pendingVendeur)} tone="red" />
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Réglé
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Card label="Acheteur" value={formatMad(totals.paidAcheteur)} tone="ok" />
            <Card label="Vendeur" value={formatMad(totals.paidVendeur)} tone="ok" />
          </div>
        </div>
      </div>

      {/* Paiements acheteurs à vérifier */}
      <section className="space-y-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">Paiements à vérifier</h3>
          <p className="text-xs text-muted-foreground">
            Justificatifs déposés par les acheteurs. Vérifiez puis validez ou rejetez.
          </p>
        </div>
        {pendingBuyerPayments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">Aucun justificatif en attente.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {pendingBuyerPayments.map((p) => (
              <li key={p.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {p.carLabel ?? "—"}{" "}
                      {p.carId && <span className="font-mono text-primary">#{p.carId}</span>}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Acheteur: {p.userNom ?? p.userEmail ?? "—"} · Réf {p.reference ?? "—"}
                      {p.paymentMethod && <> · Mode {p.paymentMethod}</>}
                      {p.bank && <> · {p.bank}</>}
                      {p.dueDate && <> · Échéance {new Date(p.dueDate).toLocaleDateString("fr-MA")}</>}
                    </p>
                    <p className="mt-2 text-base font-bold text-foreground">{formatMad(p.amount)}</p>
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
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => setPayStatus(p.id, "annule")}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-sm font-semibold text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4" /> Rejeter
                    </button>
                    <button
                      onClick={() => setPayStatus(p.id, "paye")}
                      className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-sm font-semibold text-white shadow-sm hover:opacity-90"
                    >
                      <Check className="h-4 w-4" /> Valider
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>


      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
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
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Recherche</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nom, email, référence, voiture…"
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Bénéficiaire / payeur</label>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
            >
              <option value="all">Tous</option>
              {[...users].sort((a, b) => a.nom.localeCompare(b.nom)).map((u) => (
                <option key={u.id} value={u.id}>{u.nom} ({u.role})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
            >
              {(Object.keys(TYPE_LABEL) as ("all" | AdminPaymentType)[]).map((t) => (
                <option key={t} value={t}>{TYPE_LABEL[t]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Sens</label>
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value as typeof directionFilter)}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
            >
              <option value="all">Entrant & Sortant</option>
              <option value="entrant">Entrant</option>
              <option value="sortant">Sortant</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Statut</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
            >
              <option value="all">Tous statuts</option>
              {(Object.keys(STATUS_LABEL) as AdminPaymentStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>
          <div />

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
          <div className="sm:col-span-2">
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

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">Aucun paiement.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Sens</th>
                <th className="px-3 py-2">Payeur</th>
                <th className="px-3 py-2">Bénéficiaire</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Voiture</th>
                <th className="px-3 py-2 text-right">Montant</th>
                <th className="px-3 py-2">Référence</th>
                <th className="px-3 py-2">Statut</th>
                <th className="px-3 py-2">Preuve</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedFiltered.map((p) => {
                const dir = DIRECTION_BY_TYPE[p.type];
                return (
                <tr key={p.id} className="border-t border-border align-top">
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(p.paidAt ?? p.createdAt).toLocaleDateString("fr-MA")}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${DIRECTION_TONE[dir]}`}>
                      {DIRECTION_LABEL[dir]}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-foreground">{payerOf(p)}</div>
                    {dir === "entrant" && p.userEmail && (
                      <div className="text-xs text-muted-foreground">{p.userEmail}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-foreground">{beneficiaryOf(p)}</div>
                    {dir === "sortant" && p.userEmail && (
                      <div className="text-xs text-muted-foreground">{p.userEmail}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">{TYPE_LABEL[p.type]}</td>
                  <td className="px-3 py-2">
                    {p.carLabel ? (
                      <span><span className="font-mono text-primary">#{p.carId}</span> {p.carLabel}</span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold">{formatMad(p.amount)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{p.reference ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONE[p.status]}`}>
                      {STATUS_LABEL[p.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2">
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
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        onClick={() => setEditing(p)}
                        className="rounded-md border border-border p-1.5 hover:bg-secondary"
                        title="Modifier"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => remove(p)}
                        className="rounded-md border border-border p-1.5 text-destructive hover:bg-destructive/10"
                        title="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ListPagination page={page} pageCount={pageCount} onPageChange={setPage} />

      {editing && (
        <PaymentDialog
          users={users}
          payment={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}

function Card({ label, value, tone }: { label: string; value: string; tone?: "orange" | "red" | "ok" }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={`mt-1 text-lg font-bold ${
          tone === "orange"
            ? "text-orange-600"
            : tone === "red"
              ? "text-red-600"
              : tone === "ok"
                ? "text-emerald-600"
                : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function PaymentDialog({
  payment,
  users,
  onClose,
  onSaved,
}: {
  payment: AdminPayment | null;
  users: AdminUser[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [userId, setUserId] = useState(payment?.userId ?? "");
  const [type, setType] = useState<AdminPaymentType>(payment?.type ?? "achat");
  const [amount, setAmount] = useState<number>(payment?.amount ?? 0);
  const [status, setStatus] = useState<AdminPaymentStatus>(payment?.status ?? "paye");
  const [reference, setReference] = useState(payment?.reference ?? "");
  const [auctionId, setAuctionId] = useState(payment?.auctionId ?? "");
  const [carId, setCarId] = useState(payment?.carId ?? "");
  const [notes, setNotes] = useState(payment?.notes ?? "");
  const [paidAt, setPaidAt] = useState(
    (payment?.paidAt ?? new Date().toISOString()).slice(0, 10),
  );
  const [proofUrl, setProofUrl] = useState(payment?.proofUrl ?? "");
  const [proofName, setProofName] = useState(payment?.proofName ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>(payment?.paymentMethod ?? "virement");
  const [bank, setBank] = useState(payment?.bank ?? "");
  const [dueDate, setDueDate] = useState(payment?.dueDate ?? "");
  const [saving, setSaving] = useState(false);

  // Default user list by relevance for the chosen type
  const userOptions = useMemo(() => {
    return [...users].sort((a, b) => a.nom.localeCompare(b.nom));
  }, [users]);

  const save = async () => {
    if (!userId) return toast.error("Sélectionnez un utilisateur");
    if (!amount || amount <= 0) return toast.error("Montant invalide");
    setSaving(true);
    try {
      let finalProofUrl = proofUrl;
      let finalProofName = proofName;
      if (file) {
        const up = await supabaseAdminPaiements.uploadProof(file, userId);
        finalProofUrl = up.path;
        finalProofName = up.name;
      }
      await supabaseAdminPaiements.upsert({
        id: payment?.id ?? null,
        userId,
        type,
        amount,
        status,
        auctionId: auctionId || null,
        carId: carId || null,
        reference: reference || null,
        proofUrl: finalProofUrl || null,
        proofName: finalProofName || null,
        notes: notes || null,
        paidAt: paidAt ? new Date(paidAt).toISOString() : null,
        paymentMethod: (paymentMethod as never) || null,
        bank: bank || null,
        dueDate: paymentMethod === "cheque" && dueDate ? dueDate : null,
      });
      toast.success(payment ? "Paiement mis à jour" : "Paiement enregistré");
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-xl rounded-xl border border-border bg-background p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">
            {payment ? "Modifier le paiement" : "Nouveau paiement"}
          </h3>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Bénéficiaire">
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
            >
              <option value="">— Sélectionner —</option>
              {userOptions.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nom} ({u.role}) — {u.email}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Type">
            <select
              value={type}
              onChange={(e) => setType(e.target.value as AdminPaymentType)}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
            >
              {(["achat", "virement_vendeur", "commission", "remboursement", "caution"] as AdminPaymentType[]).map((t) => (
                <option key={t} value={t}>{TYPE_LABEL[t]}</option>
              ))}
            </select>
          </Field>

          <Field label="Montant (DH)">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
            />
          </Field>

          <Field label="Statut">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as AdminPaymentStatus)}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
            >
              {(Object.keys(STATUS_LABEL) as AdminPaymentStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </Field>

          <Field label="Référence (virement/chèque)">
            <input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="VIR-2026-001"
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
            />
          </Field>

          <Field label="Date de règlement">
            <input
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
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

          <Field label="Banque">
            <input
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              placeholder="Attijariwafa, BMCE, CIH…"
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
            />
          </Field>

          {paymentMethod === "cheque" && (
            <Field label="Date d'échéance (chèque)">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
              />
            </Field>
          )}


          <Field label="ID Voiture (optionnel)">
            <input
              value={carId}
              onChange={(e) => setCarId(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
            />
          </Field>

          <Field label="ID Enchère (optionnel)">
            <input
              value={auctionId}
              onChange={(e) => setAuctionId(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
            />
          </Field>

          <Field label="Notes" full>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
            />
          </Field>

          <Field label="Preuve de paiement (PDF / image)" full>
            <label className="flex h-20 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border bg-background text-sm text-muted-foreground hover:bg-secondary/50">
              <Upload className="h-4 w-4" />
              {file ? file.name : proofName || "Choisir un fichier"}
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </label>
            {proofUrl && !file && (
              <p className="mt-1 text-xs text-muted-foreground">
                Fichier actuel conservé sauf remplacement.
              </p>
            )}
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
            onClick={save}
            disabled={saving}
            className="h-9 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
