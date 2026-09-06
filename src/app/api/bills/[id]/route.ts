import { requireUser, requireStaff } from "@/server/auth/rbac";
import { getBillForUser, updateBill } from "@/server/services/bill.service";
import { updateBillSchema } from "@/server/validation/purchase";
import { ok, parseJson, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    return ok({ bill: await getBillForUser(id, user) });
  } catch (e) {
    return errorToResponse(e);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff();
    const { id } = await params;
    const input = updateBillSchema.parse(await parseJson(req));
    return ok({ bill: await updateBill(id, input) });
  } catch (e) {
    return errorToResponse(e);
  }
}
