import { requireUser } from "@/server/auth/rbac";
import { getInvoiceForUser } from "@/server/services/invoice.service";
import { ok, errorToResponse } from "@/lib/http";

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
