import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Gavel, TrendingUp, Clock, Zap, ArrowLeft, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { subscribeToAuction } from "@/lib/realtime";
import type { Auction, Bid } from "@/types/auction";
import {
  formatMad,
  formatDateTime,
  listingPriceTier,
  priceTierGradientClass,
  priceTierTextClass,
} from "@/lib/format";
import { Countdown } from "@/components/Countdown";
import { CarGallery } from "@/components/CarGallery";
import { useAuth } from "@/lib/auth";
import { playBidPlacedSound, playOutbidSound } from "@/lib/sounds";

function EncherirErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="rounded-2xl border border-border bg-card p-8 text-center">
      <h2 className="text-lg font-bold text-foreground">Une erreur est survenue</h2>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <button
        onClick={() => {
          router.invalidate();
          reset();
        }}
        className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground"
      >
        Réessayer
      </button>
    </div>
  );
}

export const Route = createFileRoute("/acheteur/encherir/$auctionId")({
  loader: async ({ params }) => {
    const [auction, bids] = await Promise.all([
      api.getAuction(params.auctionId),
      api.listBids(params.auctionId),
    ]);
    return { auction, bids };
  },
  head: ({ loaderData }) => {
    const car = loaderData?.auction.car;
    const title = car ? `Enchérir — ${car.marque} ${car.modele}` : "Enchérir — Bidlik";
    return {
      meta: [{ title }, { name: "robots", content: "noindex,nofollow" }],
    };
  },
  errorComponent: EncherirErrorComponent,
  notFoundComponent: () => (
    <div className="rounded-2xl border border-border bg-card p-8 text-center">
      <h2 className="text-lg font-bold text-foreground">Enchère introuvable</h2>
      <Link
        to="/acheteur/encheres"
        className="mt-3 inline-block text-sm font-semibold text-accent hover:underline"
      >
        ← Retour à mes enchères
      </Link>
    </div>
  ),
  component: EncherirPage,
});

const QUICK_INCREMENTS = [1000, 5000, 10000, 25000];

function EncherirPage() {
  const initial = Route.useLoaderData();
  const { user } = useAuth();
  const [auction, setAuction] = useState<Auction>(initial.auction);
  const [bids, setBids] = useState<Bid[]>(initial.bids);
  const [pulseKey, setPulseKey] = useState(0);
  const [autoBid, setAutoBid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const auctionRef = useRef(auction);
  auctionRef.current = auction;

  const cautionOk = user?.cautionValidee ?? false;
  const isLive = auction.status === "live";
  const isSealed = auction.auctionType === "fermee";
  const displayPrice = isSealed ? (auction.car.minimumAcceptedPrice ?? auction.startingPrice) : auction.currentPrice;
  const priceLabel = isSealed ? "Prix minimum" : "Offre actuelle";
  const tier = listingPriceTier(displayPrice, auction.car);
  const myLastBid = bids.find((b) => b.bidderId === "me");
  const isLeader = auction.topBidderId === "me";

  useEffect(() => {
    const unsub = subscribeToAuction(auction.id, ({ bid }) => {
      setBids((prevBids) => {
        if (prevBids.some((b) => b.id === bid.id)) return prevBids;
        return [bid, ...prevBids.filter((b) => !b.id.startsWith("optimistic-"))].slice(0, 50);
      });
      setAuction((prev) => {
        if (bid.bidderId !== "me" && prev.topBidderId === "me") {
          playOutbidSound();
        }
        if (bid.amount <= prev.currentPrice && prev.topBidderId === bid.bidderId) return prev;
        const msLeft = new Date(prev.endsAt).getTime() - Date.now();
        return {
          ...prev,
          currentPrice: Math.max(prev.currentPrice, bid.amount),
          bidCount: prev.bidCount + 1,
          topBidderId: bid.bidderId,
          endsAt: msLeft <= 120_000
            ? new Date(Date.now() + 120_000).toISOString()
            : prev.endsAt,
        };
      });
      setPulseKey((k) => k + 1);
    });
    return unsub;
  }, [auction.id]);

  async function placeBid(
    target: { increment: number } | { amount: number },
    isAuto = false,
  ) {
    if (submitting) return;
    const current = auctionRef.current;
    if (current.status !== "live") return;
    if (!cautionOk) {
      toast.error("Caution requise", {
        description: "Validez votre caution avant d'enchérir.",
      });
      return;
    }
    const amount =
      "increment" in target ? current.currentPrice + target.increment : target.amount;
    if (amount <= current.currentPrice) {
      toast.error("Montant insuffisant", {
        description: `Le montant doit dépasser ${formatMad(current.currentPrice)}.`,
      });
      return;
    }
    // Optimistic update — instant feedback; reconcile on RPC response.
    const prevAuction = current;
    const prevBids = bids;
    const optimisticId = `optimistic-${Date.now()}`;
    setAuction((a) => ({
      ...a,
      currentPrice: amount,
      bidCount: a.bidCount + 1,
      topBidderId: "me",
    }));
    setBids((b) => [
      {
        id: optimisticId,
        auctionId: current.id,
        carId: current.car.id,
        bidderId: "me",
        bidderName: "Vous",
        amount,
        isAuto,
        createdAt: new Date().toISOString(),
      },
      ...b,
    ].slice(0, 50));
    setPulseKey((k) => k + 1);
    playBidPlacedSound();
    setSubmitting(true);
    try {
      await api.placeBid({ auctionId: current.id, amount, isAuto });
      toast.success("Offre placée", {
        description: `${formatMad(amount)} — vous êtes en tête.`,
      });
      setCustomAmount("");
    } catch (e) {
      setAuction(prevAuction);
      setBids(prevBids);
      toast.error("Offre refusée", {
        description: e instanceof Error ? e.message : "Erreur inconnue",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function placeCustom() {
    const n = Number(customAmount.replace(/\s/g, ""));
    if (!Number.isFinite(n) || n <= 0) {
      toast.error("Montant invalide");
      return;
    }
    placeBid({ increment: n });
  }

  function toggleAuto() {
    const next = !autoBid;
    setAutoBid(next);
    api.setAutoBid(auction.id, next).catch(() => setAutoBid(!next));
    toast(next ? "Auto-enchère activée" : "Auto-enchère désactivée", {
      description: next ? "+1 000 DH automatiquement à chaque surenchère." : undefined,
    });
  }

  const car = auction.car;

  return (
    <div className="space-y-4">
      <Link
        to="/acheteur/encheres"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Mes enchères
      </Link>

      {/* HERO: live status banner */}
      <div
        key={pulseKey}
        className={[
          "overflow-hidden rounded-xl shadow-[var(--shadow-elevated)] sm:rounded-2xl",
          priceTierGradientClass(tier),
          "animate-pulse-bid",
        ].join(" ")}
      >
        <div className="grid gap-4 p-4 sm:grid-cols-3 sm:p-6">
          <div>
            <p
              className={[
                "flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider",
                "text-white/85",
              ].join(" ")}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              {priceLabel}
            </p>
            <p
              className={[
                "mt-1 text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl",
                "text-white",
              ].join(" ")}
            >
              {formatMad(displayPrice)}
            </p>
            <p className={["mt-1 text-xs", "text-white/85"].join(" ")}>
              {auction.bidCount} {auction.bidCount > 1 ? "offres" : "offre"}
            </p>
          </div>
          <div>
            <p
              className={[
                "flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider",
                "text-white/85",
              ].join(" ")}
            >
              <Clock className="h-3.5 w-3.5" />
              Temps restant
            </p>
            <p
              className={[
                "mt-1 text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl",
                "text-white",
              ].join(" ")}
            >
              <Countdown endsAt={auction.endsAt} className={"!text-white"} />
            </p>
            <p className={["mt-1 text-xs", "text-white/85"].join(" ")}>
              Fin : {formatDateTime(auction.endsAt)}
            </p>
          </div>
          <div>
            <p
              className={[
                "flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider",
                "text-white/85",
              ].join(" ")}
            >
              <Gavel className="h-3.5 w-3.5" />
              Mon offre
            </p>
            <p
              className={[
                "mt-1 text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl",
                "text-white",
              ].join(" ")}
            >
              {myLastBid ? formatMad(myLastBid.amount) : "—"}
            </p>
            <p className={["mt-1 text-xs", "text-white/85"].join(" ")}>
              {myLastBid
                ? isLeader
                  ? "✓ Vous êtes en tête"
                  : "⚠ Vous êtes surenchéri"
                : "Aucune offre placée"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* LEFT: Vehicle */}
        <div className="space-y-4 lg:order-1">
          <div className="overflow-hidden rounded-xl border border-border bg-card p-3 shadow-sm sm:rounded-2xl sm:p-4">
            <CarGallery images={car.images} marque={car.marque} modele={car.modele} />
            <div className="mt-4">
              <h1 className="text-xl font-bold tracking-tight text-foreground">
                <span className="font-mono text-primary">#{car.id}</span> — {car.marque}{" "}
                {car.modele}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {car.finition} · {car.annee} · {car.kilometrage.toLocaleString("fr-MA")} km
              </p>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Spec label="Carburant" value={car.carburant} cap />
              <Spec label="Boîte" value={car.transmission} cap />
              <Spec label="Puiss. fisc." value={`${car.puissanceFiscale} CV`} />
              <Spec label="Note expert" value={car.noteExpert ? `${car.noteExpert}/10` : "—"} />
            </dl>
          </div>

          {/* Bid history */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-foreground">Historique des offres</h2>
            {bids.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Aucune offre. Soyez le premier à enchérir !
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {bids.slice(0, 10).map((b, i) => {
                  const mine = b.bidderId === "me";
                  return (
                    <li
                      key={b.id}
                      className={[
                        "flex items-center justify-between gap-3 py-2.5 text-sm",
                        i === 0 ? "font-semibold" : "",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={[
                            "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold",
                            mine
                              ? "bg-accent text-accent-foreground"
                              : "bg-secondary text-secondary-foreground",
                          ].join(" ")}
                        >
                          {mine ? "MOI" : b.bidderName.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <p className="text-foreground">
                            {mine ? "Vous" : b.bidderName}
                            {b.isAuto && (
                              <span className="ml-1.5 rounded-full bg-secondary px-1.5 py-0.5 text-[9px] font-bold text-secondary-foreground">
                                AUTO
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatDateTime(b.createdAt)}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`font-bold ${priceTierTextClass(listingPriceTier(b.amount, auction.car))}`}
                      >
                        {formatMad(b.amount)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* RIGHT: Bid panel (sticky) */}
        <aside className="order-first lg:order-2 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:rounded-2xl sm:p-5">
            <h2 className="text-sm font-semibold text-foreground">Placer une offre</h2>

            {!isLive ? (
              <div className="mt-4 rounded-lg bg-secondary p-4 text-center text-sm text-secondary-foreground">
                Cette enchère est terminée.
              </div>
            ) : !cautionOk ? (
              <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs leading-relaxed text-destructive">
                ⚠️ Caution non validée.{" "}
                <Link to="/acheteur/caution" className="font-semibold underline">
                  Régulariser
                </Link>
              </div>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {QUICK_INCREMENTS.map((inc) => (
                    <button
                      key={inc}
                      onClick={() => placeBid({ increment: inc })}
                      disabled={submitting}
                      className="rounded-lg bg-accent px-3 py-3 text-sm font-bold text-accent-foreground shadow-sm transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      +{inc.toLocaleString("fr-MA")} DH
                    </button>
                  ))}
                </div>

                <div className="mt-3">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Montant à ajouter à l'offre actuelle
                  </label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value.replace(/[^\d\s]/g, ""))}
                      placeholder="ex. 2 000"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                    <button
                      onClick={placeCustom}
                      disabled={submitting || !customAmount}
                      className="shrink-0 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                    >
                      Enchérir
                    </button>
                  </div>
                </div>

                <button
                  onClick={toggleAuto}
                  className={[
                    "mt-3 flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                    autoBid
                      ? "border-accent bg-accent/10 text-foreground"
                      : "border-border bg-background text-foreground hover:bg-secondary",
                  ].join(" ")}
                >
                  <span className="flex items-center gap-2">
                    <Zap
                      className={[
                        "h-4 w-4",
                        autoBid ? "text-accent" : "text-muted-foreground",
                      ].join(" ")}
                    />
                    Auto-enchère
                  </span>
                  <span
                    className={[
                      "flex h-5 w-9 items-center rounded-full p-0.5 transition-colors",
                      autoBid ? "bg-accent" : "bg-muted",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "h-4 w-4 rounded-full bg-white shadow transition-transform",
                        autoBid ? "translate-x-4" : "translate-x-0",
                      ].join(" ")}
                    />
                  </span>
                </button>

                <p className="mt-3 flex items-start gap-1.5 rounded-md bg-secondary/60 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  Toutes les offres sont fermes et engageantes. Caution validée.
                </p>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Spec({ label, value, cap }: { label: string; value: string; cap?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 px-2.5 py-2">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd
        className={["mt-0.5 text-sm font-semibold text-foreground", cap ? "capitalize" : ""].join(
          " ",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
