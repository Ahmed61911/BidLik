import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { Auction } from "@/types/auction";
import { formatMad, listingPriceTier, priceTierGradientClass, timeRemaining } from "@/lib/format";
import { subscribeToAuction } from "@/lib/realtime";
import { Countdown } from "./Countdown";

/**
 * Lot card — represents ONE car within a multi-car auction event.
 * Subscribes to realtime updates scoped per car (per-lot), independent of
 * other lots in the same event.
 */
export function LotCard({ auction: initial }: { auction: Auction }) {
  const [auction, setAuction] = useState(initial);
  const [pulse, setPulse] = useState(0);
  const [, setTick] = useState(0);

  // Per-car realtime subscription (channel: auction:{lotId}:bid).
  useEffect(() => {
    return subscribeToAuction(auction.id, ({ bid }) => {
      setAuction((prev) =>
        bid.amount > prev.currentPrice
          ? {
              ...prev,
              currentPrice: bid.amount,
              bidCount: prev.bidCount + 1,
              topBidderId: bid.bidderId,
              endsAt:
                new Date(prev.endsAt).getTime() - Date.now() <= 120_000
                  ? new Date(Date.now() + 120_000).toISOString()
                  : prev.endsAt,
            }
          : prev,
      );
      setPulse((p) => p + 1);
    });
  }, [auction.id]);

  // Tick every second to drive the low-time pulsing visuals.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const { car, currentPrice, bidCount, status } = auction;
  const isSealed = auction.auctionType === "fermee";
  const displayPrice = isSealed ? (car.minimumAcceptedPrice ?? auction.startingPrice) : currentPrice;
  const priceLabel = isSealed ? "Prix minimum" : "Offre actuelle";
  const tier = listingPriceTier(displayPrice, car);
  const isLive = status === "live";
  const isScheduled = status === "scheduled";
  const img = car.images?.[0];

  // Low-time urgency: only when LIVE (not scheduled). Two tiers for stronger
  // visual escalation as the deadline approaches.
  const { totalMs, expired } = timeRemaining(auction.endsAt);
  const critical = isLive && !expired && totalMs < 60_000; // < 1 min
  const urgent = isLive && !expired && totalMs < 5 * 60_000; // < 5 min

  return (
    <Link
      to="/auctions/$auctionId"
      params={{ auctionId: auction.id }}
      className={[
        "group flex flex-col overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]",
        critical
          ? "border-destructive ring-2 ring-destructive/60 animate-pulse"
          : urgent
            ? "border-destructive/60 ring-1 ring-destructive/40 animate-pulse"
            : "border-border",
      ].join(" ")}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-secondary">
        {img ? (
          <img src={img} alt={`${car.marque} ${car.modele}`} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="hero-gradient absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-white/90">{car.marque}</span>
          </div>
        )}
        {isLive ? (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-semibold text-destructive-foreground">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> EN DIRECT
          </span>
        ) : isScheduled ? (
          <span className="absolute left-2 top-2 rounded-full bg-accent/90 px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
            PROGRAMMÉE
          </span>
        ) : (
          <span className="absolute left-2 top-2 rounded-full bg-foreground/80 px-2 py-0.5 text-[10px] font-semibold text-background">
            TERMINÉE
          </span>
        )}
        {car.noteExpert != null && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-background/95 px-2 py-0.5 text-[10px] font-bold text-foreground">
            ★ {car.noteExpert}/10
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-foreground">
              <span className="font-mono text-primary">#{car.id}</span> — {car.marque} {car.modele}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {car.annee} · {car.kilometrage.toLocaleString("fr-MA")} km
            </p>
          </div>
        </div>

        <div
          key={pulse}
          className={[
            "rounded-lg px-2.5 py-2 animate-pulse-bid",
            priceTierGradientClass(tier),
          ].join(" ")}
        >
          <p className={["text-[9px] font-semibold uppercase tracking-wider", "text-white/85"].join(" ")}>
            {priceLabel}
          </p>
          <p className={["text-base font-extrabold tracking-tight", "text-white"].join(" ")}>
            {formatMad(displayPrice)}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-border pt-2 text-[11px]">
          <span className="text-muted-foreground">{bidCount} {bidCount > 1 ? "offres" : "offre"}</span>
          {isLive ? (
            <Countdown endsAt={auction.endsAt} compact />
          ) : isScheduled ? (
            <Countdown endsAt={auction.startsAt} compact />
          ) : (
            <span className="text-muted-foreground">Terminée</span>
          )}
        </div>
      </div>
    </Link>
  );
}
