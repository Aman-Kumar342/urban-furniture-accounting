import { requireStaff } from "@/server/auth/rbac";
import { unarchiveAccount } from "@/server/services/account.service";
import { ok, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff();
    const { id } = await params;
    return ok({ account: await unarchiveAccount(id) });
  } catch (e) {
    return errorToResponse(e);
  }
}
