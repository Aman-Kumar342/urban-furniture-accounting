import { parseCents } from "@/lib/journalEntries";

// A small, real donut: the achieved share of committed. Not decoration — it reads the budget's
// own committed/achieved figures. Achieved arc in income green, the rest is the neutral track.
export function BudgetDonut({ committed, achieved, size = 84 }: { committed: string; achieved: string; size?: number }) {
  const c = parseCents(committed) ?? 0;
  const a = parseCents(achieved) ?? 0;
  const pct = c > 0 ? Math.min(100, Math.round((a / c) * 100)) : 0;
  const r = 34;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 80 80" width={size} height={size} className="-rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="var(--color-line)" strokeWidth="10" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke="var(--color-income)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ - dash}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="tnum text-sm font-semibold text-ink">{pct}%</span>
        <span className="text-[0.6rem] text-muted">achieved</span>
      </div>
    </div>
  );
}
