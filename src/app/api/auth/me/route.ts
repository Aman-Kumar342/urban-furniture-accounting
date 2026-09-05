import { getCurrentUser, toSafeUser } from "@/server/auth/rbac";
import { ok, fail } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return fail("UNAUTHENTICATED", "Not signed in.", 401);
  return ok({ user: toSafeUser(user) });
}
