import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth/rbac";
import { Logo } from "@/components/brand/Logo";
import { SignupForm } from "./SignupForm";

export const dynamic = "force-dynamic";

// Public sign-up: creates a customer (CONTACT) portal account. Structure per the Excalidraw
// Sign Up page (App Logo → fields → action), rendered as a premium centered card.
export default async function SignupPage() {
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
      <div className="w-full max-w-[420px]">
        <div className="rounded-xl border border-line bg-surface px-8 py-9 shadow-[0_1px_2px_rgba(33,28,24,0.05),0_10px_28px_-14px_rgba(33,28,24,0.14)]">
          <div className="flex justify-center text-pine">
            <Logo />
          </div>
          <h1 className="mt-7 text-center font-display text-xl text-ink">Create your account</h1>
          <p className="mt-1 text-center text-sm text-muted">
            Sign up to view and pay your invoices.
          </p>
          <div className="mt-6">
            <SignupForm />
          </div>
        </div>

        <p className="mt-5 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-pine transition-colors hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
