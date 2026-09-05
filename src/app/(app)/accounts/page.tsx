import { AccountsList } from "./AccountsList";

export const dynamic = "force-dynamic";

// Chart of Accounts (mockup §2.3). Staff-guarded by the (app) layout; data via GET /api/accounts.
export default function AccountsPage() {
  return <AccountsList />;
}
