import { ProfitLossReport } from "./ProfitLossReport";

export const dynamic = "force-dynamic";

// Profit & Loss (mockup §6.1). Staff-guarded; data via GET /api/reports/profit-loss?year=.
export default function ProfitLossPage() {
  return <ProfitLossReport />;
}
