import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Gavel } from "lucide-react";
import { api } from "@/lib/api";
import { timeRemaining } from "@/lib/format";
import { resolveCarImageUrl } from "@/lib/carImages";
import type { Auction } from "@/types/auction";
import heroCarsRow from "@/assets/next_auction_bg.jpg";

const URGENT_THRESHOLD_MS = 60 * 60_000; // last hour

type Highlight = {
  auction: Auction;
  target: string; // ISO timestamp the countdown counts down to
  label: string;
};

/** Public homepage teaser — the next scheduled session, or (if none) the
 * live session ending soonest. Anonymous-safe: only reads `ouvert`
 * (public) auctions, same columns the /auctions listing already exposes
 * to anon visitors. */
export function NextAuctionCountdown() {
  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api
      .listAuctions("live")
      .then((auctions) => {
        if (cancelled) return;
        const open = auctions.filter((a) => a.visibility === "ouvert");
        const now = Date.now();

        const nextScheduled = open
          .filter((a) => a.status === "scheduled" && new Date(a.startsAt).getTime() > now)
          .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0];

        if (nextScheduled) {
          setHighlight({ auction: nextScheduled, target: nextScheduled.startsAt, label: "Démarre dans" });
        } else {
          const soonestEnding = open
            .filter((a) => a.status === "live")
            .sort((a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime())[0];
          setHighlight(
            soonestEnding
              ? { auction: soonestEnding, target: soonestEnding.endsAt, label: "Se termine dans" }
              : null,
          );
        }
      })
      .catch(() => setHighlight(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !highlight) return null;

  const { auction, target, label } = highlight;
  const { car } = auction;
  const cover = car.images[0] ? resolveCarImageUrl(car.images[0]) : undefined;

  return (
    <section className="relative overflow-hidden py-14 text-primary-foreground sm:py-16">
      <div className="absolute inset-0">
        <img
          src={heroCarsRow}
          alt=""
          aria-hidden="true"
          className="h-full w-full scale-105 object-cover blur-[2px]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/95 via-primary/90 to-primary/95" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,oklch(0.66_0.21_35_/_0.3),transparent_60%)]" />
      </div>
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        <Link
          to="/auctions/$auctionId"
          params={{ auctionId: auction.id }}
          className="group block overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[var(--shadow-elevated)] backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-accent/40"
        >
          <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div className="flex items-center gap-4">
              {cover && (
                <img
                  src={cover}
                  alt={`${car.marque} ${car.modele}`}
                  className="hidden h-16 w-24 shrink-0 rounded-xl object-cover shadow-md sm:block"
                />
              )}
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
                  </span>
                  Prochaine enchère
                </span>
                <h2 className="font-display mt-2.5 text-xl font-extrabold leading-tight sm:text-2xl">
                  {car.marque} {car.modele}{" "}
                  <span className="font-normal text-white/60">({car.annee})</span>
                </h2>
                <p className="mt-0.5 text-xs text-white/60 sm:text-sm">{label} :</p>
              </div>
            </div>

            <CountdownBlocks target={target} />
          </div>

          <div className="flex items-center justify-center gap-1.5 border-t border-white/10 bg-white/[0.03] py-3 text-xs font-semibold uppercase tracking-wider text-accent transition-colors group-hover:bg-white/[0.06] sm:justify-end sm:px-8">
            <Gavel className="h-3.5 w-3.5" />
            Voir l'enchère
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </div>
        </Link>
      </div>
    </section>
  );
}

function CountdownBlocks({ target }: { target: string }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const { d, h, m, s, totalMs, expired } = timeRemaining(target);
  const urgent = !expired && totalMs <= URGENT_THRESHOLD_MS;

  if (expired) return null;

  return (
    <div
      className={[
        "flex items-center gap-2 rounded-2xl p-2 sm:gap-2.5",
        urgent ? "animate-urgent-glow" : "",
      ].join(" ")}
    >
      {d > 0 && (
        <>
          <Digit value={d} label="Jours" urgent={urgent} />
          <Sep urgent={urgent} />
        </>
      )}
      <Digit value={h} label="Heures" urgent={urgent} />
      <Sep urgent={urgent} />
      <Digit value={m} label="Min" urgent={urgent} />
      <Sep urgent={urgent} />
      <Digit value={s} label="Sec" urgent={urgent} />
    </div>
  );
}

function Digit({ value, label, urgent }: { value: number; label: string; urgent: boolean }) {
  return (
    <div className="flex flex-col items-center">
      <div
        key={value}
        className={[
          "flex h-13 w-13 animate-pulse-bid items-center justify-center rounded-xl border font-display text-2xl font-extrabold tabular-nums shadow-inner sm:h-16 sm:w-16 sm:text-3xl",
          urgent
            ? "border-destructive/50 bg-destructive text-destructive-foreground"
            : "border-white/15 bg-white/10 text-white",
        ].join(" ")}
      >
        {String(value).padStart(2, "0")}
      </div>
      <span
        className={[
          "mt-1.5 text-[10px] font-semibold uppercase tracking-wider",
          urgent ? "text-destructive" : "text-white/55",
        ].join(" ")}
      >
        {label}
      </span>
    </div>
  );
}

function Sep({ urgent }: { urgent: boolean }) {
  return (
    <span className={["pb-4 text-xl font-bold", urgent ? "text-destructive" : "text-white/30"].join(" ")}>
      :
    </span>
  );
}
