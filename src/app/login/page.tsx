import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/rbac";
import { Logo } from "@/components/brand/Logo";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel — the one bold element; everything else stays quiet. */}
      <section
        className="relative hidden flex-col justify-between overflow-hidden bg-pine p-10 text-paper lg:flex"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent, transparent 31px, rgba(245,244,240,0.05) 31px, rgba(245,244,240,0.05) 32px)",
        }}
      >
        <Logo className="text-paper" />
        <div className="max-w-md">
          <h1 className="font-display text-4xl leading-[1.12] tracking-tight">
            Double-entry accounting, built for the workshop floor.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-paper/70">
            Record sales, purchases, and payments. Every entry balances, and the Balance Sheet
            always ties out.
          </p>
        </div>
        <p className="text-xs text-paper/50">Urban Furniture · Accounting System</p>
      </section>

      {/* Sign-in panel */}
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-pine lg:hidden">
            <Logo />
          </div>
          <h2 className="font-display text-2xl text-ink">Sign in</h2>
          <p className="mt-1 text-sm text-muted">Welcome back. Enter your details to continue.</p>
          <div className="mt-6">
            <LoginForm />
          </div>
        </div>
      </section>
    </main>
  );
}
