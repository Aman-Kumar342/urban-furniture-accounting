import { requireStaff } from "@/server/auth/rbac";
import { createBillFromPurchaseOrder } from "@/server/services/purchaseOrder.service";
import { ok, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireStaff();
    const { id } = await params;
    return ok({ bill: await createBillFromPurchaseOrder(id, user.id) }, 201);
  } catch (e) {
    return errorToResponse(e);
  }
}
