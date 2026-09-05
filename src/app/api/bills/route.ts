import { requireUser } from "@/server/auth/rbac";
import { listBills } from "@/server/services/bill.service";
import { ok, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireUser();
    return ok({ bills: await listBills(user) });
  } catch (e) {
    return errorToResponse(e);
  }
}
