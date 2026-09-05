import { BudgetsList } from "./BudgetsList";

export const dynamic = "force-dynamic";

// Budget (mockup §5). Staff-guarded by the (app) layout; data via GET /api/budgets.
export default function BudgetsPage() {
  return <BudgetsList />;
}
