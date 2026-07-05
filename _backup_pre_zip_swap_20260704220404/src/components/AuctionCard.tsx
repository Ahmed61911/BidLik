import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Auction } from "@/types/auction";
import { formatMad, listingPriceTier, priceTierGradientClass } from "@/lib/format";

import { Countdown } from "./Countdown";

interface Props {
  auction: Auction;
}

export function AuctionCard({ auction }: Props) {
  const { car, currentPrice, bidCount, status } = auction;
  const isSealed = auction.auctionType === "fermee";
  const displayPrice = isSealed ? (car.minimumAcceptedPrice ?? auction.startingPrice) : currentPrice;
  const priceLabel = isSealed ? "Prix minimum" : "Offre actuelle";
  const tier = listingPriceTier(displayPrice, car);
  const isLive = status === "live";
  const images = car.images ?? [];
  const [activeIdx, setActiveIdx] = useState(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (images.length <= 1 || hovered) return;
    // Slow, calm cadence; staggered per card so they don't all flip together.
    const offset = (parseInt(auction.id.replace(/\D/g, "") || "0", 10) % 5) * 350;
    const id = window.setInterval(
      () => setActiveIdx((i) => (i + 1) % images.length),
      5000 + offset,
    );
    return () => window.clearInterval(id);
  }, [images.length, hovered, auction.id]);

  return (
    <Link
      to="/auctions/$auctionId"
      params={{ auctionId: auction.id }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]"
    >
      {/* Image slideshow */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-secondary">
        {images.length > 0 ? (
          <>
            {images.map((src, i) => (
              <img
                key={src}
                src={src}
                alt={`${car.marque} ${car.modele}`}
                loading={i === 0 ? "eager" : "lazy"}
                className={["slide-img absolute inset-0 h-full w-full object-cover", i === activeIdx ? "is-active" : ""].join(" ")}
              />
            ))}
            {images.length > 1 && (
              <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
                {images.map((_, i) => (
                  <span
                    key={i}
                    className={[
                      "h-1.5 rounded-full transition-all",
                      i === activeIdx ? "w-4 bg-white" : "w-1.5 bg-white/50",
                    ].join(" ")}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="hero-gradient absolute inset-0 flex items-center justify-center">
            <span className="text-3xl font-bold tracking-tight text-white/90">
              {car.marque}
            </span>
          </div>
        )}
        {isLive ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-destructive px-2.5 py-1 text-xs font-semibold text-destructive-foreground shadow-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            EN DIRECT
          </span>
        ) : (
          <span className="absolute left-3 top-3 rounded-full bg-foreground/80 px-2.5 py-1 text-xs font-semibold text-background">
            {status === "validated" ? "VALIDÉE" : status === "cancelled" ? "ANNULÉE" : "TERMINÉE"}
          </span>
        )}
        {car.noteExpert != null && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/95 px-2.5 py-1 text-xs font-bold text-foreground shadow-sm">
            ★ {car.noteExpert}/10
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-bold leading-tight text-foreground">
              <span className="font-mono text-primary">#{car.id}</span> — {car.marque} {car.modele}
            </h3>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigator.clipboard
                  .writeText(car.id)
                  .then(() => toast.success(`ID #${car.id} copié`))
                  .catch(() => toast.error("Impossible de copier l'ID"));
              }}
              title="Copier l'ID de la voiture"
              className="shrink-0 inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold uppercase tracking-wider text-primary transition-colors hover:bg-primary/20"
            >
              #{car.id}
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {car.annee} · {car.kilometrage.toLocaleString("fr-MA")} km · {car.carburant}
          </p>
        </div>

        {/* Price block with gradient indicator */}
        <div
          className={[
            "rounded-lg px-3 py-2.5",
            priceTierGradientClass(tier),
          ].join(" ")}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/85">
            {priceLabel}
          </p>
          <p className="text-lg font-extrabold tracking-tight text-white">
            {formatMad(displayPrice)}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs">
          <span className="text-muted-foreground">
            {bidCount} {bidCount > 1 ? "offres" : "offre"}
          </span>
          {isLive ? <Countdown endsAt={auction.endsAt} compact /> : (
            <span className="font-medium text-muted-foreground">Terminée</span>
          )}
        </div>
      </div>
    </Link>
  );
}
