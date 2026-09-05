import { PortalInvoices } from "./PortalInvoices";

export const dynamic = "force-dynamic";

// Customer portal home = the contact's own invoices (server-scoped via GET /api/invoices).
export default function PortalHomePage() {
  return <PortalInvoices />;
}
