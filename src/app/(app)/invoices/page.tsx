import { InvoicesList } from "./InvoicesList";

export const dynamic = "force-dynamic";

// Customer Invoices (mockup §4.4). Staff-guarded by the (app) layout; data via GET /api/invoices.
export default function InvoicesPage() {
  return <InvoicesList />;
}
