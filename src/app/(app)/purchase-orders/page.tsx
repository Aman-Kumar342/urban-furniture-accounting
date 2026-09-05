import { PurchaseOrdersList } from "./PurchaseOrdersList";

export const dynamic = "force-dynamic";

// Purchase Orders (mockup §4.1). Staff-guarded by the (app) layout; data via GET /api/purchase-orders.
export default function PurchaseOrdersPage() {
  return <PurchaseOrdersList />;
}
