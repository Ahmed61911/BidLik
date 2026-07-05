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
 *  - Reference: prixPlancher (fallback prixAttendu).
 *  - < 90%  → rouge (below)
 *  - 90-99% → orange (near)
 *  - ≥ 100% → vert (above)
 */
export function listingPriceTier(
  current: number,
  car: { prixPlancher?: number | null; prixAttendu?: number | null },
): PriceTier {
  const reference = car.prixPlancher ?? car.prixAttendu ?? 0;
  return priceTier(current, reference);
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
