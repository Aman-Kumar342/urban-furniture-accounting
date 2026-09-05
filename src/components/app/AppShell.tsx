"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { NAV_SECTIONS, titleForPath } from "./nav";

const ROLE_LABEL: Record<string, string> = { ADMIN: "Admin", ACCOUNTANT: "Accountant", CONTACT: "Contact" };

interface AppShellProps {
  user: { name: string; role: string };
  children: React.ReactNode;
}

// The staff workspace chrome: deep-pine sidebar (mockup's nav groups, grown progressively) +
// a topbar with the current section, the signed-in user, and logout. Sidebar is a drawer on
// mobile. Showing/hiding admin-only entries is UX only — the API is the real boundary.
export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isAdmin = user.role === "ADMIN";

  const sections = NAV_SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((it) => !it.adminOnly || isAdmin),
  })).filter((s) => s.items.length > 0);

  return (
    <div className="min-h-screen md:pl-60">
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-pine text-paper transition-transform duration-200 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 shrink-0 items-center border-b border-white/10 px-5">
          <Link href="/" onClick={() => setOpen(false)} className="text-paper">
            <Logo />
          </Link>
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {sections.map((section, i) => (
            <div key={i}>
              {section.label && (
                <p className="px-3 pb-1.5 text-xs font-semibold text-paper/45">{section.label}</p>
              )}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center border-l-2 px-3 py-2 text-sm transition-colors ${
                          active
                            ? "border-walnut bg-white/10 font-medium text-paper"
                            : "border-transparent text-paper/70 hover:bg-white/5 hover:text-paper"
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-ink/40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-line bg-surface px-4 md:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="-ml-1 flex h-9 w-9 items-center justify-center rounded-md text-ink hover:bg-line/60 md:hidden"
            aria-label="Open menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <h1 className="font-display text-lg text-ink">{titleForPath(pathname)}</h1>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="hidden text-sm text-ink sm:block">{user.name}</span>
          <span className="rounded-full border border-line bg-paper px-2.5 py-0.5 text-xs font-medium text-pine">
            {ROLE_LABEL[user.role] ?? user.role}
          </span>
          <LogoutButton />
        </div>
      </header>

      <main className="p-4 md:p-8">{children}</main>
    </div>
  );
}
