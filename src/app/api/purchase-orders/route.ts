import { requireStaff } from "@/server/auth/rbac";
import { createPurchaseOrderSchema } from "@/server/validation/purchase";
import { createPurchaseOrder, listPurchaseOrders } from "@/server/services/purchaseOrder.service";
import { ok, parseJson, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await requireStaff();
    const input = createPurchaseOrderSchema.parse(await parseJson(req));
    return ok({ purchaseOrder: await createPurchaseOrder(input, user.id) }, 201);
  } catch (e) {
    return errorToResponse(e);
  }
}

export async function GET() {
  try {
    await requireStaff();
    return ok({ purchaseOrders: await listPurchaseOrders() });
  } catch (e) {
    return errorToResponse(e);
  }
}
