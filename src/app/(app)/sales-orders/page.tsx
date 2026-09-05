import { SalesOrdersList } from "./SalesOrdersList";

export const dynamic = "force-dynamic";

// Sales Orders (mockup §4.3). Staff-guarded by the (app) layout; data via GET /api/sales-orders.
export default function SalesOrdersPage() {
  return <SalesOrdersList />;
}
