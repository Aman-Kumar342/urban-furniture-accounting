import Link from "next/link";
import { AnalyticAccountForm } from "@/components/analyticAccounts/AnalyticAccountForm";

export const dynamic = "force-dynamic";

export default function NewAnalyticAccountPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/analytic-accounts" className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-pine">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Analytic accounts
      </Link>
      <h1 className="font-display text-xl text-ink">New analytic account</h1>
      <AnalyticAccountForm />
    </div>
  );
}
