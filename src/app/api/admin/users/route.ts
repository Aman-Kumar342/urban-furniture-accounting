import { Role } from "@prisma/client";
import { requireRole, toSafeUser } from "@/server/auth/rbac";
import { createUserSchema } from "@/server/validation/auth";
import { createUserByAdmin } from "@/server/services/admin.service";
import { ok, fail, errorToResponse } from "@/lib/http";

// ADMIN-only. Server-side RBAC is the security boundary: the role check runs before the body
// is even parsed, so a non-admin (or anonymous) request never creates a user.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await requireRole(Role.ADMIN);
  } catch (e) {
    return errorToResponse(e); // 401 anonymous / 403 non-admin
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("BAD_JSON", "Request body must be valid JSON.", 400);
  }

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION", "Invalid input.", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    const user = await createUserByAdmin(parsed.data);
    return ok({ user: toSafeUser(user) }, 201);
  } catch (e) {
    return errorToResponse(e);
  }
}
