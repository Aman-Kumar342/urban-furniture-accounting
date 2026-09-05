import { requireStaff } from "@/server/auth/rbac";
import { createBudgetSchema } from "@/server/validation/budget";
import { createBudget, listBudgets } from "@/server/services/budget.service";
import { ok, parseJson, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await requireStaff();
    const input = createBudgetSchema.parse(await parseJson(req));
    return ok({ budget: await createBudget(input) }, 201);
  } catch (e) {
    return errorToResponse(e);
  }
}

export async function GET() {
  try {
    await requireStaff();
    return ok({ budgets: await listBudgets() });
  } catch (e) {
    return errorToResponse(e);
  }
}
