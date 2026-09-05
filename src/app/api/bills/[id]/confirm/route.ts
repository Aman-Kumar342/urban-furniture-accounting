import { requireStaff } from "@/server/auth/rbac";
import { confirmBill } from "@/server/services/bill.service";
import { ok, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireStaff();
    const { id } = await params;
    return ok(await confirmBill(id, user.id));
  } catch (e) {
    return errorToResponse(e);
  }
}
