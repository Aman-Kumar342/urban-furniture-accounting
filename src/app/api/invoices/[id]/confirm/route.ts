import { requireStaff } from "@/server/auth/rbac";
import { confirmInvoice } from "@/server/services/invoice.service";
import { ok, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireStaff();
    const { id } = await params;
    return ok(await confirmInvoice(id, user.id));
  } catch (e) {
    return errorToResponse(e);
  }
}
