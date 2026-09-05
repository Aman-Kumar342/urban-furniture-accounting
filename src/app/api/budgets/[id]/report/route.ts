import { requireStaff } from "@/server/auth/rbac";
import { getBudgetReport } from "@/server/services/budget.service";
import { ok, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

// Read-only Budget Report: Committed / Achieved / Achieved% / Amount-to-Achieve per analytic.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff();
    const { id } = await params;
    return ok(await getBudgetReport(id));
  } catch (e) {
    return errorToResponse(e);
  }
}
