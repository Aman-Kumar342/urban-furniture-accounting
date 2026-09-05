import { redirect } from "next/navigation";
import { getCurrentUser, toSafeUser } from "@/server/auth/rbac";
import { PortalShell } from "@/components/portal/PortalShell";

export const dynamic = "force-dynamic";

// The customer portal is for CONTACT users only. Staff belong in the workspace; anonymous users
// sign in. The real boundary is the API (contact-scoped, requireUser) — this guard is UX.
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "CONTACT") redirect("/");

  return <PortalShell user={toSafeUser(user)}>{children}</PortalShell>;
}
