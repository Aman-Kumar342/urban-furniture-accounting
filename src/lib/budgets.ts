import type { BadgeTone } from "@/components/ui/Badge";
import type { AnalyticType } from "@/lib/analyticAccounts";

export type BudgetState = "DRAFT" | "CONFIRMED" | "REVISED" | "CANCELLED";

export interface BudgetLineRow {
  id: string;
  analyticAccountId: string;
  analyticAccount?: { id: string; name: string; type: AnalyticType } | null;
  type: AnalyticType;
  committedAmount: string;
}

export interface BudgetRow {
  id: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  responsibleId: string | null;
  state: BudgetState;
  revisionOfId: string | null;
  lines: { committedAmount: string }[];
  revisionOf: { id: string; name: string } | null;
  createdAt: string;
}

export interface BudgetDetail {
  id: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  responsibleId: string | null;
  state: BudgetState;
  revisionOfId: string | null;
  lines: BudgetLineRow[];
  revisionOf: { id: string; name: string } | null;
  revisions: { id: string; name: string; state: BudgetState }[];
}

// From GET /budgets/[id]/report — the derived figures (money fields are Decimal strings).
export interface BudgetReportLine {
  analyticAccountId: string;
  analyticName: string;
  type: AnalyticType;
  committed: string;
  achieved: string;
  achievedPct: string;
  amountToAchieve: string;
}
export interface BudgetReport {
  budgetId: string;
  name: string;
  state: BudgetState;
  periodStart: string;
  periodEnd: string;
  lines: BudgetReportLine[];
  totalCommitted: string;
  totalAchieved: string;
}

export const BUDGET_STATE_LABEL: Record<BudgetState, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  REVISED: "Revised",
  CANCELLED: "Cancelled",
};

export const BUDGET_STATE_TONE: Record<BudgetState, BadgeTone> = {
  DRAFT: "neutral",
  CONFIRMED: "income",
  REVISED: "amber",
  CANCELLED: "oxblood",
};
