import { BalanceSheetReport } from "./BalanceSheetReport";

export const dynamic = "force-dynamic";

// Balance Sheet (mockup §6.2). Staff-guarded; data via GET /api/reports/balance-sheet?year=.
export default function BalanceSheetPage() {
  return <BalanceSheetReport />;
}
