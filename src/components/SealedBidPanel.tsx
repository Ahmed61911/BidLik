import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Auction, Offer } from "@/types/auction";
import { formatMad, formatDateTime } from "@/lib/format";
import { Countdown } from "./Countdown";
import { useAuth } from "@/lib/auth";

/**
 * Confidential sealed-bid (enveloppe fermée) panel.
 * Hides current price, history and competitor activity.
 * Buyer sees only their own offers + minimum required price.
 */
export function SealedBidPanel({ auction }: { auction: Auction }) {
  const { user, isAuthenticated, hasRole } = useAuth();
  const isAcheteur = hasRole("acheteur");
  const isAdmin = hasRole("admin");
  const cautionOk = user?.cautionValidee ?? false;
  const canBid = isAuthenticated && isAcheteur && cautionOk;
  const isLive = auction.status === "live";

  const min = auction.car.minimumAcceptedPrice ?? auction.startingPrice;
  const [amount, setAmount] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [myOffers, setMyOffers] = useState<Offer[]>([]);
  const [allOffers, setAllOffers] = useState<Offer[]>([]);

  useEffect(() => {
    if (canBid) api.listMyOffers(auction.id).then(setMyOffers).catch(() => {});
    if (isAdmin) api.listAllOffersAdmin(auction.id).then(setAllOffers).catch(() => {});
  }, [auction.id, canBid, isAdmin]);

  async function submit() {
    const n = Number(amount.replace(/\s/g, ""));
    if (!Number.isFinite(n) || n <= 0) { toast.error("Montant invalide"); return; }
    if (!(n > min)) { toast.error(`Offre doit être > ${formatMad(min)}`); return; }
    setSubmitting(true);
    try {
      await api.submitOffer({ auctionId: auction.id, amount: n });
      toast.success("Offre confidentielle enregistrée");
      setAmount("");
      const mine = await api.listMyOffers(auction.id);
      setMyOffers(mine);
      if (isAdmin) setAllOffers(await api.listAllOffersAdmin(auction.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  const lastMine = myOffers[myOffers.length - 1];

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-accent/30 bg-card shadow-[var(--shadow-elevated)]">
      <div className="bg-gradient-to-br from-foreground via-foreground to-primary p-5 text-background">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
              <Lock className="h-3 w-3" /> Enveloppe fermée
            </span>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-white/80">
              Prix minimum accepté
            </p>
            <p className="mt-1 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              {formatMad(min)}
            </p>
            <p className="mt-1 text-[11px] text-white/75">
              Votre offre doit être strictement supérieure
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-white/20 pt-3 text-sm text-white/85">
          <span>Clôture dans</span>
          <Countdown endsAt={auction.endsAt} className="!text-white !text-base font-mono font-bold" />
        </div>
      </div>

      <div className="space-y-3 p-5">
        <div className="flex items-start gap-2 rounded-md border border-accent/30 bg-accent/5 p-3 text-xs leading-relaxed text-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <span>
            Vente <strong>confidentielle</strong>. Vous ne voyez ni les autres offres, ni le nombre de participants. À la clôture, l'offre la plus élevée remporte la voiture (sous validation Bidlik).
          </span>
        </div>

        {!isLive ? (
          <div className="rounded-lg bg-secondary p-4 text-center text-sm text-secondary-foreground">
            Cette enchère est terminée.
          </div>
        ) : !isAuthenticated ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            🔒 <Link to="/login" className="font-semibold underline">Connectez-vous</Link> pour soumettre une offre.
          </div>
        ) : !isAcheteur ? (
          <div className="rounded-md border border-border bg-secondary/60 p-3 text-xs text-muted-foreground">
            👁️ Mode observateur — seuls les acheteurs peuvent soumettre une offre.
          </div>
        ) : !cautionOk ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            ⚠️ Votre caution n'est pas validée.{" "}
            <Link to="/acheteur/caution" className="font-semibold underline">Régulariser</Link>
          </div>
        ) : (
          <>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">
                Votre offre confidentielle (DH)
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d\s]/g, ""))}
                placeholder={`> ${min.toLocaleString("fr-MA")}`}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            </label>
            <button
              onClick={submit}
              disabled={submitting || !amount}
              className="w-full rounded-lg bg-foreground px-4 py-3 text-sm font-bold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Envoi…" : lastMine ? "Mettre à jour mon offre" : "Soumettre mon offre"}
            </button>

            {myOffers.length > 0 && (
              <div className="rounded-lg border border-border bg-secondary/40 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Mes offres (privées)
                </p>
                <ul className="mt-1.5 space-y-1 text-xs">
                  {myOffers.map((o) => (
                    <li key={o.id} className="flex items-center justify-between">
                      <span className="text-muted-foreground">{formatDateTime(o.updatedAt)}</span>
                      <span className="font-bold text-foreground">{formatMad(o.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {isAdmin && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
              Vue admin · Classement des offres ({allOffers.length})
            </p>
            {allOffers.length === 0 ? (
              <p className="mt-2 text-xs text-muted-foreground">Aucune offre soumise.</p>
            ) : (
              <ol className="mt-2 space-y-1 text-xs">
                {allOffers.map((o, i) => (
                  <li key={o.id} className={["flex items-center justify-between rounded px-2 py-1", i === 0 ? "bg-success/15 font-bold text-success" : "text-foreground"].join(" ")}>
                    <span>#{i + 1} · {o.userName}</span>
                    <span className="font-mono">{formatMad(o.amount)}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
