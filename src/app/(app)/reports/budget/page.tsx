import { BudgetReport } from "./BudgetReport";

export const dynamic = "force-dynamic";

// Budget Report (mockup §5.2). Staff-guarded; aggregates GET /api/budgets/[id]/report.
export default function BudgetReportPage() {
  return <BudgetReport />;
}
