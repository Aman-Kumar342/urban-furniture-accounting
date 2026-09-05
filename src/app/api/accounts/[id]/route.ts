import { requireStaff } from "@/server/auth/rbac";
import { updateAccountSchema } from "@/server/validation/account";
import { getAccount, updateAccount } from "@/server/services/account.service";
import { ok, parseJson, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff();
    const { id } = await params;
    return ok({ account: await getAccount(id) });
  } catch (e) {
    return errorToResponse(e);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff();
    const { id } = await params;
    const input = updateAccountSchema.parse(await parseJson(req));
    return ok({ account: await updateAccount(id, input) });
  } catch (e) {
    return errorToResponse(e);
  }
}
