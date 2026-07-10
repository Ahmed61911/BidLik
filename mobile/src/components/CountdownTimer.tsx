import { useEffect, useState } from "react";
import { Text } from "react-native";
import { formatCountdown, timeRemaining } from "@/utils/format";

interface Props {
  endsAt: string;
  compact?: boolean;
  className?: string;
}

/**
 * Server-driven countdown — ported from webapp/src/components/Countdown.tsx.
 * endsAt comes from the server; this only computes the visual delta. The
 * server still enforces auction closing, this is purely UI.
 */
export function CountdownTimer({ endsAt, compact, className }: Props) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const { expired, totalMs } = timeRemaining(endsAt);
  const urgent = !expired && totalMs < 5 * 60_000;
  const colorClass = urgent ? "text-destructive" : expired ? "text-muted-foreground" : "text-foreground";
  const sizeClass = compact ? "text-sm" : "text-base font-semibold";

  return <Text className={`font-mono ${colorClass} ${sizeClass} ${className ?? ""}`}>{formatCountdown(endsAt)}</Text>;
}
