import { PortalBills } from "../PortalBills";

export const dynamic = "force-dynamic";

// The contact's own bills (server-scoped via GET /api/bills).
export default function PortalBillsPage() {
  return <PortalBills />;
}
