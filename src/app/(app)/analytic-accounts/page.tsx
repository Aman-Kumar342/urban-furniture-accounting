import { AnalyticAccountsList } from "./AnalyticAccountsList";

export const dynamic = "force-dynamic";

// Analytic Accounts (mockup §2.5). Staff-guarded by the (app) layout; data via GET /api/analytic-accounts.
export default function AnalyticAccountsPage() {
  return <AnalyticAccountsList />;
}
