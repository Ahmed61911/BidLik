import { useEffect, useState } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { timeRemaining } from "@/lib/format";

interface Props {
  deadline: string | null | undefined;
  label?: string;
  className?: string;
  /** Hide label, show only countdown chip */
  compact?: boolean;
}

/**
 * Visual countdown for post-closure deadlines (24h admin validation, 48h buyer payment).
 * Turns warning < 6h, danger < 1h, and shows "Délai dépassé" once expired.
 */
export function DeadlineCountdown({ deadline, label, className, compact }: Props) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!deadline) return null;
  const { d, h, m, s, totalMs, expired } = timeRemaining(deadline);

  const tone = expired
    ? "expired"
    : totalMs < 60 * 60_000
      ? "danger"
      : totalMs < 6 * 60 * 60_000
        ? "warn"
        : "ok";

  const chipCls =
    tone === "expired"
      ? "bg-muted text-muted-foreground"
      : tone === "danger"
        ? "bg-destructive/15 text-destructive animate-pulse"
        : tone === "warn"
          ? "bg-amber-100 text-amber-900"
          : "bg-emerald-100 text-emerald-900";

  const pad = (n: number) => n.toString().padStart(2, "0");
  const value = expired
    ? "Délai dépassé"
    : d > 0
      ? `${d}j ${pad(h)}h ${pad(m)}m`
      : `${pad(h)}:${pad(m)}:${pad(s)}`;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className ?? ""}`}>
      {!compact && label && (
        <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      )}
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold font-mono tabular-nums ${chipCls}`}
      >
        {tone === "expired" ? (
          <AlertTriangle className="h-3 w-3" />
        ) : (
          <Clock className="h-3 w-3" />
        )}
        {value}
      </span>
    </span>
  );
}
