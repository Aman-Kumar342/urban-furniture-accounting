import { Role } from "@prisma/client";
import { requireRole } from "@/server/auth/rbac";
import { ok, errorToResponse } from "@/lib/http";

// Demonstrates server-side RBAC: only ADMIN passes; others get 403, anonymous gets 401.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await requireRole(Role.ADMIN);
    return ok({ ok: true, message: "admin access granted", role: user.role });
  } catch (e) {
    return errorToResponse(e);
  }
}
