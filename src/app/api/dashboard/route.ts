import { requireStaff } from "@/server/auth/rbac";
import { getDashboard } from "@/server/services/dashboard.service";
import { ok, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireStaff();
    return ok(await getDashboard());
  } catch (e) {
    return errorToResponse(e);
  }
}
