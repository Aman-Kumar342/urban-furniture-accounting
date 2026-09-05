import { requireStaff } from "@/server/auth/rbac";
import { confirmPurchaseOrder } from "@/server/services/purchaseOrder.service";
import { ok, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff();
    const { id } = await params;
    return ok(await confirmPurchaseOrder(id));
  } catch (e) {
    return errorToResponse(e);
  }
}
