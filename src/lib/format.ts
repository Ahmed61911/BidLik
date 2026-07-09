/**
 * Centralized formatters for Moroccan Dirham (MAD) and dates in French.
 * Use these everywhere — never hand-format currency in components.
 */

const madFormatter = new Intl.NumberFormat("fr-MA", {
  style: "decimal",
  maximumFractionDigits: 0,
});

export function formatMad(amount: number): string {
  return `${madFormatter.format(amount)} DH`;
}

export function formatMadShort(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} M DH`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)} K DH`;
  return `${amount} DH`;
}

const dateFormatter = new Intl.DateTimeFormat("fr-MA", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return dateFormatter.format(d);
}

const dateFormatterPrecise = new Intl.DateTimeFormat("fr-MA", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  fractionalSecondDigits: 3,
});

/** Same as formatDateTime but with milliseconds — for logs where bid order/timing matters. */
export function formatDateTimePrecise(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return dateFormatterPrecise.format(d);
}

/**
 * Converts a Postgres timestamptz ISO string to microseconds since epoch,
 * WITHOUT going through `Date.getTime()` for the fractional part — that
 * truncates to millisecond resolution, throwing away real precision Postgres
 * actually stored and PostgREST actually sent over the wire. Used so bid
 * interval math is exact to the microsecond, not just "as exact as `Date`
 * allows".
 */
function microsSinceEpoch(iso: string): number {
  const dot = iso.indexOf(".");
  if (dot === -1) return new Date(iso).getTime() * 1000;
  const head = iso.slice(0, dot);
  const rest = iso.slice(dot + 1);
  const fracMatch = rest.match(/^\d+/);
  const frac = fracMatch ? fracMatch[0] : "0";
  const tz = rest.slice(frac.length) || "Z";
  const wholeSecondMs = new Date(head + tz).getTime();
  const fractionalMicros = Math.round(Number(`0.${frac}`) * 1_000_000);
  return wholeSecondMs * 1000 + fractionalMicros;
}

/** Exact microsecond interval between two Postgres timestamptz values (newer - older). */
export function microsecondsBetween(olderIso: string, newerIso: string): number {
  return microsSinceEpoch(newerIso) - microsSinceEpoch(olderIso);
}

/**
 * Formats a microsecond duration as precisely as it's meaningful to show:
 * milliseconds to 3 decimal places (i.e. down to the microsecond — the
 * actual storage precision) under a minute, then minutes/hours/days once the
 * sub-second digits stop mattering.
 */
export function formatBidInterval(microseconds: number): string {
  const ms = Math.max(0, microseconds) / 1000;
  if (ms < 1000) return `${ms.toFixed(3)} ms`;
  const totalWholeMs = Math.floor(ms);
  const totalSec = Math.floor(totalWholeMs / 1000);
  if (totalSec < 60) return `${(totalWholeMs / 1000).toFixed(3)} s`;
  const subSecMs = totalWholeMs - totalSec * 1000;
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  if (mins < 60) {
    return `${mins} min ${secs.toString().padStart(2, "0")}.${subSecMs.toString().padStart(3, "0")} s`;
  }
  const hours = Math.floor(mins / 60);
  const remMin = mins % 60;
  if (hours < 24) return `${hours} h ${remMin.toString().padStart(2, "0")} min`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return `${days} j ${remHours.toString().padStart(2, "0")} h`;
}

/**
 * Returns time remaining as { d, h, m, s, totalMs, expired }.
 * Always compute relative to a server-provided endsAt — never trust client clock alone.
 */
export function timeRemaining(endsAt: Date | string) {
  const end = typeof endsAt === "string" ? new Date(endsAt).getTime() : endsAt.getTime();
  const now = Date.now();
  const totalMs = Math.max(0, end - now);
  const expired = totalMs === 0;
  const s = Math.floor(totalMs / 1000) % 60;
  const m = Math.floor(totalMs / 1000 / 60) % 60;
  const h = Math.floor(totalMs / 1000 / 60 / 60) % 24;
  const d = Math.floor(totalMs / 1000 / 60 / 60 / 24);
  return { d, h, m, s, totalMs, expired };
}

/**
 * Price-vs-expected tier:
 *  - "below"  : current < 90% of expected   → red (destructive)
 *  - "near"   : 90% ≤ current < 100%        → orange (warning)
 *  - "above"  : current ≥ 100% of expected  → green (success)
 */
export type PriceTier = "below" | "near" | "above";

export function priceTier(current: number, expected: number): PriceTier {
  if (expected <= 0) return "above";
  const ratio = current / expected;
  if (ratio < 0.9) return "below";
  if (ratio < 1) return "near";
  return "above";
}

export function priceTierTextClass(tier: PriceTier): string {
  return tier === "below" ? "text-destructive" : tier === "near" ? "text-warning" : "text-success";
}

export function priceTierBgClass(tier: PriceTier): string {
  return tier === "below" ? "bg-destructive" : tier === "near" ? "bg-warning" : "bg-success";
}

export function priceTierGradientClass(tier: PriceTier): string {
  return tier === "below" ? "bid-gradient-below" : tier === "near" ? "bid-gradient-fair" : "bid-gradient-above";
}

/**
 * Listing price tier — unified color for the current price displayed on
 * every listing, for every user role.
 *  - Reference: prixPlancher.
 *  - < 90%  → rouge (below)
 *  - 90-99% → orange (near)
 *  - ≥ 100% → vert (above)
 */
export function listingPriceTier(current: number, car: { prixPlancher: number }): PriceTier {
  return priceTier(current, car.prixPlancher);
}

/**
 * Buyer/Admin perspective price tier (inverse of seller):
 *  - "deal"  : current < 90% of expected      → green (bonne affaire pour l'acheteur)
 *  - "fair"  : 90% ≤ current ≤ 110%           → orange (prix juste)
 *  - "over"  : current > 110% of expected     → red (surpayé)
 */
export type BuyerPriceTier = "deal" | "fair" | "over";

export function buyerPriceTier(current: number, expected: number): BuyerPriceTier {
  if (expected <= 0) return "fair";
  const ratio = current / expected;
  if (ratio < 0.9) return "deal";
  if (ratio <= 1.1) return "fair";
  return "over";
}

export function buyerPriceTierTextClass(tier: BuyerPriceTier): string {
  return tier === "deal" ? "text-success" : tier === "fair" ? "text-warning" : "text-destructive";
}

export function buyerPriceTierBgClass(tier: BuyerPriceTier): string {
  return tier === "deal" ? "bg-success" : tier === "fair" ? "bg-warning" : "bg-destructive";
}

export function buyerPriceTierGradientClass(tier: BuyerPriceTier): string {
  return tier === "deal" ? "bid-gradient-above" : tier === "fair" ? "bid-gradient-fair" : "bid-gradient-below";
}

export function formatCountdown(endsAt: Date | string): string {
  const { d, h, m, s, expired } = timeRemaining(endsAt);
  if (expired) return "Terminée";
  if (d > 0) return `${d}j ${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m`;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
