import { requireUser } from "@/server/auth/rbac";
import { getPaymentForUser } from "@/server/services/payment.service";
import { ok, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    return ok({ payment: await getPaymentForUser(id, user) });
  } catch (e) {
    return errorToResponse(e);
  }
}
