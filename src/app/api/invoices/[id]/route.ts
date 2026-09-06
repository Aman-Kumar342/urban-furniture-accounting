import { requireUser, requireStaff } from "@/server/auth/rbac";
import { getInvoiceForUser, updateInvoice } from "@/server/services/invoice.service";
import { updateInvoiceSchema } from "@/server/validation/sales";
import { ok, parseJson, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    return ok({ invoice: await getInvoiceForUser(id, user) });
  } catch (e) {
    return errorToResponse(e);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireStaff();
    const { id } = await params;
    const input = updateInvoiceSchema.parse(await parseJson(req));
    return ok({ invoice: await updateInvoice(id, input) });
  } catch (e) {
    return errorToResponse(e);
  }
}
