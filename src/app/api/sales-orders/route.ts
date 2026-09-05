import { requireStaff } from "@/server/auth/rbac";
import { createSalesOrderSchema } from "@/server/validation/sales";
import { createSalesOrder, listSalesOrders } from "@/server/services/salesOrder.service";
import { ok, parseJson, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await requireStaff();
    const input = createSalesOrderSchema.parse(await parseJson(req));
    return ok({ salesOrder: await createSalesOrder(input, user.id) }, 201);
  } catch (e) {
    return errorToResponse(e);
  }
}

export async function GET() {
  try {
    await requireStaff();
    return ok({ salesOrders: await listSalesOrders() });
  } catch (e) {
    return errorToResponse(e);
  }
}
