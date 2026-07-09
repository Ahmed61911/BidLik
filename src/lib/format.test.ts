import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatMad,
  formatMadShort,
  timeRemaining,
  formatCountdown,
  priceTier,
  buyerPriceTier,
  listingPriceTier,
  priceTierTextClass,
  buyerPriceTierTextClass,
  microsecondsBetween,
  formatBidInterval,
} from "@/lib/format";

describe("formatMad", () => {
  // The exact thousands-separator glyph for the "fr-MA" locale is ICU-data
  // dependent (this repo's runtime -- Bun, both in dev and the Docker image
  // -- renders a literal period; some browsers render a narrow no-break
  // space instead). Assert on the digits/suffix, not the separator glyph,
  // so this test doesn't become environment- or encoding-dependent.
  it("formats with a thousands separator and DH suffix", () => {
    expect(formatMad(1000)).toMatch(/^1.000 DH$/);
  });

  it("rounds to no decimal places", () => {
    expect(formatMad(999.6)).toMatch(/^1.000 DH$/);
  });

  it("formats zero", () => {
    expect(formatMad(0)).toBe("0 DH");
  });

  // Negative amounts are not a real-world case (prices are never negative),
  // but the formatter should not throw or silently misbehave if one ever
  // slips through (e.g. a bad ecart/delta calculation elsewhere).
  it("does not throw on a negative amount", () => {
    expect(() => formatMad(-500)).not.toThrow();
  });
});

describe("formatMadShort", () => {
  it("shows raw DH under 1000", () => {
    expect(formatMadShort(500)).toBe("500 DH");
  });

  it("switches to K at exactly 1000", () => {
    expect(formatMadShort(1000)).toBe("1 K DH");
  });

  it("just under the K boundary stays raw", () => {
    expect(formatMadShort(999)).toBe("999 DH");
  });

  it("switches to M at exactly 1,000,000", () => {
    expect(formatMadShort(1_000_000)).toBe("1.0 M DH");
  });

  it("just under the M boundary stays in K", () => {
    expect(formatMadShort(999_999)).toBe("1000 K DH");
  });
});

describe("timeRemaining", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("computes d/h/m/s for a future date", () => {
    const endsAt = new Date("2026-01-02T01:02:03.000Z"); // +1d 1h 2m 3s
    const r = timeRemaining(endsAt);
    expect(r).toMatchObject({ d: 1, h: 1, m: 2, s: 3, expired: false });
  });

  it("accepts an ISO string identically to a Date", () => {
    const r = timeRemaining("2026-01-01T00:00:10.000Z");
    expect(r).toMatchObject({ d: 0, h: 0, m: 0, s: 10, expired: false });
  });

  it("clamps a past date to zero instead of going negative", () => {
    const r = timeRemaining(new Date("2025-12-31T00:00:00.000Z"));
    expect(r.totalMs).toBe(0);
    expect(r.expired).toBe(true);
  });

  it("marks exactly-now as expired", () => {
    const r = timeRemaining(new Date("2026-01-01T00:00:00.000Z"));
    expect(r.expired).toBe(true);
    expect(r.totalMs).toBe(0);
  });
});

describe("formatCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("shows Terminee once expired", () => {
    expect(formatCountdown(new Date("2025-12-31T00:00:00.000Z"))).toBe("Terminée");
  });

  it("shows days format when more than a day remains", () => {
    expect(formatCountdown(new Date("2026-01-03T05:06:00.000Z"))).toBe("2j 05h 06m");
  });

  it("shows HH:MM:SS format under a day", () => {
    expect(formatCountdown(new Date("2026-01-01T02:03:04.000Z"))).toBe("02:03:04");
  });
});

describe("priceTier (seller perspective)", () => {
  it("is 'below' under 90% of expected", () => {
    expect(priceTier(89_999, 100_000)).toBe("below");
  });

  it("is exactly 'near' at the 90% boundary (inclusive)", () => {
    expect(priceTier(90_000, 100_000)).toBe("near");
  });

  it("is 'near' just under 100%", () => {
    expect(priceTier(99_999, 100_000)).toBe("near");
  });

  it("is 'above' at exactly 100%", () => {
    expect(priceTier(100_000, 100_000)).toBe("above");
  });

  it("is 'above' when expected is zero (no reference price)", () => {
    expect(priceTier(1, 0)).toBe("above");
  });

  it("is 'above' when expected is negative (defensive, should never happen)", () => {
    expect(priceTier(1, -100)).toBe("above");
  });
});

describe("buyerPriceTier (buyer perspective, inverse of seller)", () => {
  it("is 'deal' under 90% of expected", () => {
    expect(buyerPriceTier(89_999, 100_000)).toBe("deal");
  });

  it("is 'fair' at the 90% boundary (inclusive)", () => {
    expect(buyerPriceTier(90_000, 100_000)).toBe("fair");
  });

  it("is 'fair' at exactly 110% (inclusive upper bound)", () => {
    expect(buyerPriceTier(110_000, 100_000)).toBe("fair");
  });

  it("is 'over' just above 110%", () => {
    expect(buyerPriceTier(110_001, 100_000)).toBe("over");
  });

  it("is 'fair' when expected is zero", () => {
    expect(buyerPriceTier(1, 0)).toBe("fair");
  });
});

describe("listingPriceTier", () => {
  it("delegates straight to priceTier using car.prixPlancher", () => {
    expect(listingPriceTier(50_000, { prixPlancher: 100_000 })).toBe("below");
    expect(listingPriceTier(100_000, { prixPlancher: 100_000 })).toBe("above");
  });
});

describe("microsecondsBetween", () => {
  it("preserves microsecond precision Date.getTime() would truncate", () => {
    // Both timestamps round to the same millisecond (.123) — a Date-based
    // diff would report 0. The real interval, from the microsecond digits
    // Postgres/PostgREST actually sent, is 456 - 789 + 1000 = 667us... more
    // precisely: 45.123456 - 45.123 is negative if truncated wrong, so use
    // two timestamps a known 250 microseconds apart within the same millisecond.
    const older = "2026-01-01T00:00:00.123000+00:00";
    const newer = "2026-01-01T00:00:00.123250+00:00";
    expect(microsecondsBetween(older, newer)).toBe(250);
  });

  it("computes whole-second and sub-second parts together", () => {
    const older = "2026-01-01T00:00:00.500000Z";
    const newer = "2026-01-01T00:00:02.750000Z";
    expect(microsecondsBetween(older, newer)).toBe(2_250_000);
  });

  it("handles timestamps with no fractional seconds", () => {
    const older = "2026-01-01T00:00:00Z";
    const newer = "2026-01-01T00:00:05Z";
    expect(microsecondsBetween(older, newer)).toBe(5_000_000);
  });

  it("handles a non-UTC offset suffix", () => {
    const older = "2026-01-01T00:00:00.000000+01:00";
    const newer = "2026-01-01T00:00:01.000000+01:00";
    expect(microsecondsBetween(older, newer)).toBe(1_000_000);
  });
});

describe("formatBidInterval", () => {
  it("shows sub-second intervals in milliseconds to microsecond resolution", () => {
    expect(formatBidInterval(842_317)).toBe("842.317 ms");
  });

  it("shows sub-1000ms interval under the ms branch, not seconds", () => {
    expect(formatBidInterval(999_999)).toBe("999.999 ms");
  });

  it("switches to seconds at exactly 1000ms", () => {
    expect(formatBidInterval(1_000_000)).toBe("1.000 s");
  });

  it("shows seconds with millisecond precision under a minute", () => {
    expect(formatBidInterval(4_128_000)).toBe("4.128 s");
  });

  it("switches to minutes at 60 seconds", () => {
    expect(formatBidInterval(60_000_000)).toBe("1 min 00.000 s");
  });

  it("shows minutes and seconds with sub-second precision", () => {
    expect(formatBidInterval(64_128_000)).toBe("1 min 04.128 s");
  });

  it("switches to hours at 60 minutes", () => {
    expect(formatBidInterval(3_600_000_000)).toBe("1 h 00 min");
  });

  it("switches to days at 24 hours", () => {
    expect(formatBidInterval(90_000_000_000)).toBe("1 j 01 h");
  });

  it("clamps a negative interval to zero instead of showing a negative duration", () => {
    expect(formatBidInterval(-500)).toBe("0.000 ms");
  });
});

describe("tier -> CSS class mapping", () => {
  it("maps every seller tier to a distinct class", () => {
    const classes = new Set([
      priceTierTextClass("below"),
      priceTierTextClass("near"),
      priceTierTextClass("above"),
    ]);
    expect(classes.size).toBe(3);
  });

  it("maps every buyer tier to a distinct class", () => {
    const classes = new Set([
      buyerPriceTierTextClass("deal"),
      buyerPriceTierTextClass("fair"),
      buyerPriceTierTextClass("over"),
    ]);
    expect(classes.size).toBe(3);
  });
});
