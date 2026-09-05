import { requireUser } from "@/server/auth/rbac";
import { listInvoices } from "@/server/services/invoice.service";
import { ok, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    return ok({ invoices: await listInvoices(user) });
  } catch (e) {
    return errorToResponse(e);
  }
}
