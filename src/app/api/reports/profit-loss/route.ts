import { requireStaff } from "@/server/auth/rbac";
import { reportQuerySchema } from "@/server/validation/report";
import { getProfitAndLoss } from "@/server/services/report.service";
import { ok, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

// Read-only. Profit & Loss for the selected calendar year (staff only).
export async function GET(req: Request) {
  try {
    await requireStaff();
    const { searchParams } = new URL(req.url);
    const { year } = reportQuerySchema.parse({ year: searchParams.get("year") ?? undefined });
    return ok(await getProfitAndLoss(year));
  } catch (e) {
    return errorToResponse(e);
  }
}
