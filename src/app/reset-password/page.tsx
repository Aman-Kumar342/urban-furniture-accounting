import { Suspense } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const dynamic = "force-dynamic";

// Reached from a reset link (/reset-password?token=...). Consumes the existing
// POST /api/auth/reset-password — no new auth architecture. useSearchParams (in the client form)
// needs a Suspense boundary.
export default function ResetPasswordPage() {
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
          <h1 className="mt-7 text-center font-display text-xl text-ink">Set a new password</h1>
          <p className="mt-1 text-center text-sm text-muted">Choose a new password for your account.</p>
          <div className="mt-6">
            <Suspense fallback={<FormSkeleton />}>
              <ResetPasswordForm />
            </Suspense>
          </div>
        </div>

        <p className="mt-5 text-center text-sm text-muted">
          <Link href="/login" className="transition-colors hover:text-pine">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="h-11 rounded-md bg-line/50" />
      <div className="h-11 rounded-md bg-line/50" />
      <div className="h-11 rounded-md bg-pine/20" />
    </div>
  );
}
