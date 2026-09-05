import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/rbac";
import { Logo } from "@/components/brand/Logo";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

// Structure per the Excalidraw Login page: App Logo → Login ID → Password → Sign in →
// "Forgot Password · Sign Up". Rendered as a premium centered card on ruled drafting paper.
export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <main
      className="flex min-h-screen items-center justify-center px-6 py-12"
      style={{
        backgroundImage:
          "repeating-linear-gradient(to bottom, transparent, transparent 31px, rgba(33,28,24,0.035) 31px, rgba(33,28,24,0.035) 32px)",
      }}
    >
      <div className="w-full max-w-[400px]">
        <div className="rounded-xl border border-line bg-surface px-8 py-9 shadow-[0_1px_2px_rgba(33,28,24,0.05),0_10px_28px_-14px_rgba(33,28,24,0.14)]">
          <div className="flex justify-center text-pine">
            <Logo />
          </div>
          <h1 className="mt-7 text-center font-display text-xl text-ink">Sign in</h1>
          <p className="mt-1 text-center text-sm text-muted">Welcome back to Urban Furniture.</p>
          <div className="mt-6">
            <LoginForm />
          </div>
        </div>

        <p className="mt-5 text-center text-sm text-muted">
          <Link href="/forgot-password" className="transition-colors hover:text-pine">
            Forgot password?
          </Link>
          <span className="mx-2.5 text-line" aria-hidden="true">
            ·
          </span>
          <Link href="/signup" className="font-medium text-pine transition-colors hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
