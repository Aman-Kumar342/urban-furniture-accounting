import { requireStaff } from "@/server/auth/rbac";
import { updateBudgetSchema } from "@/server/validation/budget";
import { getBudget, updateBudget } from "@/server/services/budget.service";
import { ok, parseJson, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff();
    const { id } = await params;
    return ok({ budget: await getBudget(id) });
  } catch (e) {
    return errorToResponse(e);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff();
    const { id } = await params;
    const input = updateBudgetSchema.parse(await parseJson(req));
    return ok({ budget: await updateBudget(id, input) });
  } catch (e) {
    return errorToResponse(e);
  }
}
