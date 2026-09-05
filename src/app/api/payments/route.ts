import { requireStaff } from "@/server/auth/rbac";
import { createPaymentSchema } from "@/server/validation/sales";
import { receivePayment } from "@/server/services/payment.service";
import { ok, parseJson, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await requireStaff();
    const input = createPaymentSchema.parse(await parseJson(req));
    return ok(await receivePayment(input, user.id), 201);
  } catch (e) {
    return errorToResponse(e);
  }
}
