import { DashboardView } from "./DashboardView";

export const dynamic = "force-dynamic";

// Dashboard is the workspace landing (mockup §1). Staff-guarded by the (app) layout; the data
// itself comes from GET /api/dashboard through the client view below.
export default function DashboardPage() {
  return <DashboardView />;
}
