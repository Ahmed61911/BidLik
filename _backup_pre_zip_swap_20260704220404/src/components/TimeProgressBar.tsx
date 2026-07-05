import { useEffect, useState } from "react";

/**
 * Animated time progress bar.
 * Fills from 0% → 100% as the period elapses.
 * Colorized via a green → yellow → orange → red gradient that intensifies
 * (and pulses) as the remaining time shrinks.
 */
export function TimeProgressBar({
  startsAt,
  endsAt,
  className,
}: {
  startsAt: string;
  endsAt: string;
  className?: string;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  const now = Date.now();
  const total = Math.max(1, end - start);
  const elapsed = Math.min(total, Math.max(0, now - start));
  const progress = (elapsed / total) * 100;
  const remainingRatio = 1 - elapsed / total; // 1 = full time left, 0 = expired

  // Color stops based on remaining time:
  // > 50% → green, 25-50% → yellow/orange, < 25% → red.
  let from = "#22c55e"; // green-500
  let to = "#16a34a"; // green-600
  if (remainingRatio < 0.5 && remainingRatio >= 0.25) {
    from = "#facc15"; // yellow-400
    to = "#f59e0b"; // amber-500
  } else if (remainingRatio < 0.25 && remainingRatio >= 0.1) {
    from = "#fb923c"; // orange-400
    to = "#ef4444"; // red-500
  } else if (remainingRatio < 0.1) {
    from = "#ef4444"; // red-500
    to = "#b91c1c"; // red-700
  }

  const urgent = remainingRatio < 0.1 && remainingRatio > 0;

  return (
    <div
      className={[
        "relative h-full w-full overflow-hidden rounded-xl",
        className ?? "",
      ].join(" ")}
      aria-hidden="true"
    >
      <div
        className={[
          "absolute inset-y-0 left-0 transition-[width] duration-1000 ease-linear",
          urgent ? "animate-pulse" : "",
        ].join(" ")}
        style={{
          width: `${progress}%`,
          background: `linear-gradient(90deg, ${from}, ${to})`,
          boxShadow: urgent ? `0 0 24px ${to}` : `0 0 12px ${to}66`,
        }}
      />
      {/* subtle moving sheen */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)",
          backgroundSize: "200% 100%",
          animation: "shine 3s linear infinite",
        }}
      />
      <style>{`@keyframes shine { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
    </div>
  );
}
