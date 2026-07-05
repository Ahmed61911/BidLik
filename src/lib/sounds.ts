/**
 * Lightweight bid sound effects using the Web Audio API.
 * No assets, no deps — synthesized on the fly.
 */

let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(
  freq: number,
  start: number,
  duration: number,
  type: OscillatorType = "sine",
  gain = 0.18,
  freqEnd?: number,
) {
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd != null) osc.frequency.exponentialRampToValueAtTime(freqEnd, t0 + duration);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(g).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

/** Satisfying ascending two-note chime when the user places a bid. */
export function playBidPlacedSound() {
  tone(660, 0, 0.12, "triangle", 0.18);
  tone(990, 0.09, 0.18, "triangle", 0.2);
  tone(1320, 0.18, 0.22, "sine", 0.14);
}

/** Warning descending alert when the user is outbid. */
export function playOutbidSound() {
  tone(880, 0, 0.16, "square", 0.14, 520);
  tone(520, 0.18, 0.22, "square", 0.14, 320);
}

/**
 * Final-countdown urgency tick, played on a schedule that speeds up as an
 * auction nears its end (see the scheduler in auctions.$auctionId.tsx).
 * `intensity` 0..1 — 0 at the 5-minute mark, 1 in the closing seconds.
 * Pitch and sharpness both climb with intensity so the last few ticks feel
 * noticeably more alarming than the first ones, not just more frequent.
 */
export function playUrgencyTick(intensity: number) {
  const i = Math.max(0, Math.min(1, intensity));
  const freq = 720 + i * 480; // 720Hz calm -> 1200Hz frantic
  const gain = 0.12 + i * 0.1;
  tone(freq, 0, 0.07 + i * 0.03, "square", gain);
  if (i > 0.6) {
    // Double-tap tick in the final stretch for extra urgency.
    tone(freq, 0.09, 0.06, "square", gain * 0.8);
  }
}
