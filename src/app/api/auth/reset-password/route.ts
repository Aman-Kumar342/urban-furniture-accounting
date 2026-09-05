import { resetPasswordSchema } from "@/server/validation/auth";
import { resetPassword } from "@/server/services/passwordReset.service";
import { ok, fail, errorToResponse } from "@/lib/http";

// Consumes a one-time reset token and sets a new password (shared policy). The reset UI screen is
// a later increment; this endpoint completes the secure token lifecycle now.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("BAD_JSON", "Request body must be valid JSON.", 400);
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION", "Invalid input.", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    await resetPassword(parsed.data.token, parsed.data.password);
    return ok({ message: "Your password has been reset. You can now sign in." });
  } catch (e) {
    return errorToResponse(e); // invalid/expired/used -> 400 INVALID_RESET_TOKEN
  }
}
