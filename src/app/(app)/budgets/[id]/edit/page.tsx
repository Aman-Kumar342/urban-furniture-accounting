import Link from "next/link";
import { BudgetEdit } from "@/components/budgets/BudgetEdit";

export const dynamic = "force-dynamic";

export default async function EditBudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href={`/budgets/${id}`} className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-pine">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Budget
      </Link>
      <h1 className="font-display text-xl text-ink">Edit budget</h1>
      <BudgetEdit id={id} />
    </div>
  );
}
