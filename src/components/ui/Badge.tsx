import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "pine" | "walnut" | "income" | "amber" | "oxblood";

const TONES: Record<BadgeTone, string> = {
  neutral: "border-line bg-paper text-muted",
  pine: "border-pine/20 bg-pine/5 text-pine",
  walnut: "border-walnut/30 bg-walnut/5 text-walnut",
  income: "border-income/20 bg-income/5 text-income",
  amber: "border-amber/30 bg-amber/10 text-amber",
  oxblood: "border-oxblood/20 bg-oxblood/5 text-oxblood",
};

// Small, restrained status/label chip shared across list and detail screens.
export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      {children}
    </span>
  );
}
