import { logout } from "@/server/services/auth.service";
import { readSessionToken, clearSessionCookie } from "@/server/auth/cookies";
import { ok } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST() {
  const token = await readSessionToken();
  if (token) await logout(token);
  await clearSessionCookie();
  return ok({ ok: true });
}
