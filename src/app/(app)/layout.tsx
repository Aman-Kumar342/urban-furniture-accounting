import { redirect } from "next/navigation";
import { getCurrentUser, toSafeUser } from "@/server/auth/rbac";
import { AppShell } from "@/components/app/AppShell";

export const dynamic = "force-dynamic";

// Wraps every staff (Admin/Accountant) screen in the workspace shell. The API routes remain the
// real security boundary; this guard is UX (send anonymous users to sign in, portal users to
// their own placeholder).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "CONTACT") redirect("/portal");

  return <AppShell user={toSafeUser(user)}>{children}</AppShell>;
}
