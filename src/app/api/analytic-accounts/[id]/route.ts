import { requireStaff } from "@/server/auth/rbac";
import { updateAnalyticAccountSchema } from "@/server/validation/analyticAccount";
import { getAnalyticAccount, updateAnalyticAccount } from "@/server/services/analyticAccount.service";
import { ok, parseJson, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff();
    const { id } = await params;
    return ok({ analyticAccount: await getAnalyticAccount(id) });
  } catch (e) {
    return errorToResponse(e);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff();
    const { id } = await params;
    const input = updateAnalyticAccountSchema.parse(await parseJson(req));
    return ok({ analyticAccount: await updateAnalyticAccount(id, input) });
  } catch (e) {
    return errorToResponse(e);
  }
}
