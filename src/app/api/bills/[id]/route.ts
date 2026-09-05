import { requireUser } from "@/server/auth/rbac";
import { getBillForUser } from "@/server/services/bill.service";
import { ok, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    return ok({ bill: await getBillForUser(id, user) });
  } catch (e) {
    return errorToResponse(e);
  }
}
