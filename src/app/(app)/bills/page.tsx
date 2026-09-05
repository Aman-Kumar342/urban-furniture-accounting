import { BillsList } from "./BillsList";

export const dynamic = "force-dynamic";

// Vendor Bills (mockup §4.2). Staff-guarded by the (app) layout; data via GET /api/bills.
export default function BillsPage() {
  return <BillsList />;
}
