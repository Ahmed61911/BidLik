import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabaseVendeurApi } from "@/lib/supabaseVendeurApi";
import type { SellerPayout } from "@/types/vendeur";
import { formatMad } from "@/lib/format";

export const Route = createFileRoute("/vendeur/paiements")({
  component: VendeurPayoutsPage,
});

const STATUS_LABEL: Record<SellerPayout["status"], string> = {
  en_attente: "En attente",
  vire: "Viré",
  annule: "Annulé",
};
const STATUS_TONE: Record<SellerPayout["status"], string> = {
  en_attente: "bg-warning/15 text-warning-foreground",
  vire: "bg-success/15 text-success",
  annule: "bg-destructive/15 text-destructive",
};

function VendeurPayoutsPage() {
  const [payouts, setPayouts] = useState<SellerPayout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabaseVendeurApi.listPayouts().then((p) => {
      setPayouts(p);
      setLoading(false);
    });
  }, []);

  const totalNet = payouts.filter((p) => p.status === "vire").reduce((s, p) => s + p.net, 0);
  const enAttente = payouts.filter((p) => p.status === "en_attente").reduce((s, p) => s + p.net, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
          <p className="text-[11px] font-medium text-muted-foreground sm:text-xs">Total reçu</p>
          <p className="mt-1 break-words text-lg font-bold text-success sm:text-2xl">{formatMad(totalNet)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 shadow-sm sm:p-4">
          <p className="text-[11px] font-medium text-muted-foreground sm:text-xs">En attente</p>
          <p className="mt-1 break-words text-lg font-bold text-warning-foreground sm:text-2xl">{formatMad(enAttente)}</p>
        </div>
      </div>

      {/* Mobile: card list */}
      <div className="space-y-3 sm:hidden">
        {loading && (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Chargement…
          </div>
        )}
        {!loading && payouts.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Aucun paiement.
          </div>
        )}
        {payouts.map((p) => (
          <div key={p.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  <span className="font-mono text-primary">#{p.carId}</span>
                </p>
                <p className="mt-0.5 truncate text-sm text-foreground">{p.carLabel}</p>
                <p className="mt-1 text-xs text-muted-foreground">{p.date}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONE[p.status]}`}>
                {STATUS_LABEL[p.status]}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3 text-xs">
              <div>
                <p className="text-muted-foreground">Prix final</p>
                <p className="mt-0.5 font-medium text-foreground">{formatMad(p.prixFinal)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Commission</p>
                <p className="mt-0.5 font-medium text-foreground">−{formatMad(p.commission)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Net</p>
                <p className="mt-0.5 font-semibold text-success">{formatMad(p.net)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <div className="hidden overflow-x-auto rounded-xl border border-border bg-card shadow-sm sm:block">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Voiture</th>
              <th className="px-4 py-3">Prix final</th>
              <th className="px-4 py-3">Commission</th>
              <th className="px-4 py-3">Net</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Statut</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Chargement…</td></tr>}
            {!loading && payouts.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Aucun paiement.</td></tr>}
            {payouts.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium text-foreground"><span className="font-mono text-primary">#{p.carId}</span> — {p.carLabel}</td>
                <td className="px-4 py-3">{formatMad(p.prixFinal)}</td>
                <td className="px-4 py-3 text-muted-foreground">−{formatMad(p.commission)}</td>
                <td className="px-4 py-3 font-semibold text-success">{formatMad(p.net)}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.date}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONE[p.status]}`}>
                    {STATUS_LABEL[p.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
