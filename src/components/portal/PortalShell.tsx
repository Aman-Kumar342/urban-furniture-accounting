"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { LogoutButton } from "@/components/auth/LogoutButton";

// A deliberately simple customer chrome: brand, a two-item top nav, and the signed-in name.
// No sidebar, no accounting groups — this is not the staff application.
const TABS = [
  { label: "Invoices", href: "/portal", match: (p: string) => p === "/portal" || p.startsWith("/portal/invoices") },
  { label: "Bills", href: "/portal/bills", match: (p: string) => p.startsWith("/portal/bills") },
];

export function PortalShell({ user, children }: { user: { name: string }; children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link href="/portal" className="text-pine">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-ink sm:block">{user.name}</span>
            <span className="rounded-full border border-line bg-paper px-2.5 py-0.5 text-xs font-medium text-pine">Customer</span>
            <LogoutButton />
          </div>
        </div>
        <nav className="mx-auto flex max-w-4xl gap-1 px-4 sm:px-6">
          {TABS.map((t) => {
            const active = t.match(pathname);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`-mb-px border-b-2 px-3 py-2.5 text-sm transition-colors ${
                  active ? "border-pine font-medium text-ink" : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
