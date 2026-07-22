/**
 * Bid sound effects — mirrors webapp/src/lib/sounds.ts's synthesized tones,
 * but as real short WAV files (no Web Audio API on React Native) played via
 * expo-audio. Fire-and-forget, one-shot playback.
 */
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const BID_PLACED = require("../../assets/sounds/bid_placed.wav");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const OUTBID = require("../../assets/sounds/outbid.wav");

let audioModeReady: Promise<void> | null = null;
function ensureAudioMode(): Promise<void> {
  if (!audioModeReady) {
    audioModeReady = setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "mixWithOthers" }).catch(() => {});
  }
  return audioModeReady;
}

function playOneShot(source: number) {
  void ensureAudioMode().then(() => {
    const player = createAudioPlayer(source);
    player.play();
    // Release the player once playback finishes so it doesn't leak.
    const sub = player.addListener("playbackStatusUpdate", (status) => {
      if (status.didJustFinish) {
        sub.remove();
        player.remove();
      }
    });
  });
}

/** Ascending chime — played when the user places a bid. */
export function playBidPlacedSound() {
  playOneShot(BID_PLACED);
}

/** Descending alert — played when the user gets outbid. */
export function playOutbidSound() {
  playOneShot(OUTBID);
}
