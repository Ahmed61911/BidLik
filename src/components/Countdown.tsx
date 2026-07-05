import { useEffect, useState } from "react";
import { formatCountdown, timeRemaining } from "@/lib/format";

interface Props {
  endsAt: string;
  className?: string;
  /** When true, shows a compact HH:MM:SS-style label */
  compact?: boolean;
}

/**
 * Server-driven countdown.
 * The endsAt timestamp is provided by the server; we only compute the visual delta.
 * The server still enforces auction closing — this is purely UI.
 */
export function Countdown({ endsAt, className, compact }: Props) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const { expired, totalMs } = timeRemaining(endsAt);
  const urgent = !expired && totalMs < 5 * 60_000;

  return (
    <span
      className={[
        "font-mono tabular-nums",
        urgent ? "text-destructive" : expired ? "text-muted-foreground" : "text-foreground",
        compact ? "text-sm" : "text-base font-semibold",
        className ?? "",
      ].join(" ")}
    >
      {formatCountdown(endsAt)}
    </span>
  );
}
