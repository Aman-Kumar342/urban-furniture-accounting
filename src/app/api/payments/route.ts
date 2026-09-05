import { requireStaff, requireUser } from "@/server/auth/rbac";
import { createPaymentSchema } from "@/server/validation/sales";
import { registerPayment, listPayments } from "@/server/services/payment.service";
import { ok, parseJson, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

// Pay a customer invoice (RECEIVE) or a vendor bill (SEND) — exactly one. Direction is
// derived from the document by the service, never taken from the request.
export async function POST(req: Request) {
  try {
    const user = await requireStaff();
    const input = createPaymentSchema.parse(await parseJson(req));
    return ok(await registerPayment(input, user.id), 201);
  } catch (e) {
    return errorToResponse(e);
  }
}

export async function GET() {
  try {
    const user = await requireUser();
    return ok({ payments: await listPayments(user) });
  } catch (e) {
    return errorToResponse(e);
  }
}
