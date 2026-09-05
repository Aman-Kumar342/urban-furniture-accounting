import { requireStaff } from "@/server/auth/rbac";
import { archiveAnalyticAccount, unarchiveAnalyticAccount } from "@/server/services/analyticAccount.service";
import { ok, parseJson, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

// POST with optional { "unarchive": true } to restore.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff();
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as { unarchive?: boolean };
    const analyticAccount = body?.unarchive
      ? await unarchiveAnalyticAccount(id)
      : await archiveAnalyticAccount(id);
    return ok({ analyticAccount });
  } catch (e) {
    return errorToResponse(e);
  }
}
