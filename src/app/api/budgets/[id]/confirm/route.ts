import { requireStaff } from "@/server/auth/rbac";
import { confirmBudget } from "@/server/services/budget.service";
import { ok, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff();
    const { id } = await params;
    return ok({ budget: await confirmBudget(id) });
  } catch (e) {
    return errorToResponse(e);
  }
}
