import { requireStaff } from "@/server/auth/rbac";
import { reportQuerySchema } from "@/server/validation/report";
import { getBalanceSheet } from "@/server/services/report.service";
import { ok, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

// Read-only. Balance Sheet as of Dec 31 of the selected year (staff only).
export async function GET(req: Request) {
  try {
    await requireStaff();
    const { searchParams } = new URL(req.url);
    const { year } = reportQuerySchema.parse({ year: searchParams.get("year") ?? undefined });
    return ok(await getBalanceSheet(year));
  } catch (e) {
    return errorToResponse(e);
  }
}
