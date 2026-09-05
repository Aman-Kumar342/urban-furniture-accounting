import { requireStaff } from "@/server/auth/rbac";
import { getPurchaseOrder } from "@/server/services/purchaseOrder.service";
import { ok, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff();
    const { id } = await params;
    return ok({ purchaseOrder: await getPurchaseOrder(id) });
  } catch (e) {
    return errorToResponse(e);
  }
}
