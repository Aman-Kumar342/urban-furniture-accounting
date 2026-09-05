import { requireStaff } from "@/server/auth/rbac";
import { createInvoiceFromSalesOrder } from "@/server/services/salesOrder.service";
import { ok, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireStaff();
    const { id } = await params;
    return ok({ invoice: await createInvoiceFromSalesOrder(id, user.id) }, 201);
  } catch (e) {
    return errorToResponse(e);
  }
}
