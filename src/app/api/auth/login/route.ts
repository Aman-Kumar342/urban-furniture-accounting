import { loginSchema } from "@/server/validation/auth";
import { login } from "@/server/services/auth.service";
import { setSessionCookie } from "@/server/auth/cookies";
import { toSafeUser } from "@/server/auth/rbac";
import { ok, fail, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("BAD_JSON", "Request body must be valid JSON.", 400);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION", "Invalid input.", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    const { user, token } = await login(parsed.data, {
      userAgent: req.headers.get("user-agent"),
      ipAddress: req.headers.get("x-forwarded-for"),
    });
    await setSessionCookie(token);
    return ok({ user: toSafeUser(user) });
  } catch (e) {
    return errorToResponse(e);
  }
}
