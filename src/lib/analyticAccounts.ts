import type { BadgeTone } from "@/components/ui/Badge";

export type AnalyticType = "INCOME" | "EXPENSE";

// Mirrors the AnalyticAccount model. Just name + type; achieved/committed figures live in the
// Budget module, never here.
export interface AnalyticAccount {
  id: string;
  name: string;
  type: AnalyticType;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export const ANALYTIC_TYPES: { value: AnalyticType; label: string }[] = [
  { value: "INCOME", label: "Income" },
  { value: "EXPENSE", label: "Expense" },
];

export const ANALYTIC_TYPE_LABEL: Record<AnalyticType, string> = {
  INCOME: "Income",
  EXPENSE: "Expense",
};

export const ANALYTIC_TYPE_TONE: Record<AnalyticType, BadgeTone> = {
  INCOME: "income",
  EXPENSE: "amber",
};
