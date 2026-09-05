import { redirect } from "next/navigation";
import { getCurrentUser, toSafeUser } from "@/server/auth/rbac";
import { Logo } from "@/components/brand/Logo";
import { LogoutButton } from "@/components/auth/LogoutButton";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  ACCOUNTANT: "Accountant",
  CONTACT: "Contact",
};

// Intentionally minimal authenticated placeholder — NOT the dashboard. It only confirms the
// session works and offers logout. The workspace (sidebar + dashboard) is the next screen.
export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const me = toSafeUser(user);

  return (
    <main className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center justify-between border-b border-line bg-surface px-6">
        <span className="text-pine">
          <Logo />
        </span>
        <LogoutButton />
      </header>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-sm text-center">
          <p className="text-sm text-muted">Signed in as</p>
          <p className="mt-1 font-display text-2xl text-ink">{me.name}</p>
          <span className="mt-3 inline-block rounded-full border border-line bg-paper px-3 py-1 text-xs font-medium text-pine">
            {ROLE_LABEL[me.role] ?? me.role}
          </span>
          <p className="mt-6 text-sm leading-relaxed text-muted">
            Your workspace is being built one screen at a time. The dashboard arrives next.
          </p>
        </div>
      </div>
    </main>
  );
}
