import { requireStaff } from "@/server/auth/rbac";
import { createAccountSchema } from "@/server/validation/account";
import { createAccount, listAccounts } from "@/server/services/account.service";
import { ok, parseJson, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await requireStaff();
    const input = createAccountSchema.parse(await parseJson(req));
    return ok({ account: await createAccount(input) }, 201);
  } catch (e) {
    return errorToResponse(e);
  }
}

export async function GET(req: Request) {
  try {
    await requireStaff();
    const includeArchived = new URL(req.url).searchParams.get("includeArchived") === "true";
    return ok({ accounts: await listAccounts(includeArchived) });
  } catch (e) {
    return errorToResponse(e);
  }
}
