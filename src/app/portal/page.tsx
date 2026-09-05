import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/rbac";
import { Logo } from "@/components/brand/Logo";
import { LogoutButton } from "@/components/auth/LogoutButton";

export const dynamic = "force-dynamic";

// Minimal landing for signed-in CONTACT (portal) users. The customer portal itself is a later
// module; this just gives portal users a sensible place to be instead of the staff workspace.
export default async function PortalPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "CONTACT") redirect("/");

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
          <p className="font-display text-2xl text-ink">Hello, {user.name}</p>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Your customer portal is on its way. You&rsquo;ll be able to view and pay your invoices here soon.
          </p>
        </div>
      </div>
    </main>
  );
}
