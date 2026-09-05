import { forgotPasswordSchema } from "@/server/validation/auth";
import { requestPasswordReset } from "@/server/services/passwordReset.service";
import { ok, fail, errorToResponse } from "@/lib/http";

export const dynamic = "force-dynamic";

const isProduction = process.env.NODE_ENV === "production";
// Identical response whether or not the email maps to an account (no enumeration).
const GENERIC = "If an account exists for that email, you'll receive a link to reset your password.";

function requestOrigin(req: Request): string {
  const h = req.headers;
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return host ? `${proto}://${host}` : new URL(req.url).origin;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail("BAD_JSON", "Request body must be valid JSON.", 400);
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION", "Invalid input.", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    const { resetUrl } = await requestPasswordReset(parsed.data.email, requestOrigin(req));
    const payload: { message: string; devResetUrl?: string } = { message: GENERIC };
    // Development-only: surface the link so the flow is testable without an email provider.
    // Never included in production, so production responses are identical for any email.
    if (!isProduction && resetUrl) payload.devResetUrl = resetUrl;
    return ok(payload);
  } catch (e) {
    return errorToResponse(e);
  }
}
