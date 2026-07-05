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
