import Link from "next/link";
import { JournalForm } from "@/components/journals/JournalForm";

export const dynamic = "force-dynamic";

export default function NewJournalPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/journals" className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-pine">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Journals
      </Link>
      <h1 className="font-display text-xl text-ink">New journal</h1>
      <JournalForm />
    </div>
  );
}
