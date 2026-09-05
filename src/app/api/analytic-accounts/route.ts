import { requireStaff } from "@/server/auth/rbac";
import { createAnalyticAccountSchema } from "@/server/validation/analyticAccount";
import { createAnalyticAccount, listAnalyticAccounts } from "@/server/services/analyticAccount.service";
import { ok, parseJson, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await requireStaff();
    const input = createAnalyticAccountSchema.parse(await parseJson(req));
    return ok({ analyticAccount: await createAnalyticAccount(input) }, 201);
  } catch (e) {
    return errorToResponse(e);
  }
}

export async function GET(req: Request) {
  try {
    await requireStaff();
    const includeArchived = new URL(req.url).searchParams.get("includeArchived") === "true";
    return ok({ analyticAccounts: await listAnalyticAccounts(includeArchived) });
  } catch (e) {
    return errorToResponse(e);
  }
}
