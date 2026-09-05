"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { BudgetForm } from "@/components/budgets/BudgetForm";
import type { BudgetDetail } from "@/lib/budgets";

// Only a DRAFT budget can be edited (the backend enforces this too). Confirmed budgets are
// changed by revising, not editing.
export function BudgetEdit({ id }: { id: string }) {
  const [budget, setBudget] = useState<BudgetDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "notfound" | "locked" | "ready">("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await apiFetch<{ budget: BudgetDetail }>(`/api/budgets/${id}`);
      setBudget(res.budget);
      setStatus(res.budget.state === "DRAFT" ? "ready" : "locked");
    } catch (e) {
      setStatus(e instanceof ApiRequestError && e.code === "NOT_FOUND" ? "notfound" : "error");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (status === "loading") return <div className="h-64 rounded-lg border border-line bg-surface" />;
  if (status === "notfound" || status === "locked") {
    return (
      <div className="rounded-lg border border-line bg-surface px-6 py-12 text-center">
        <p className="font-display text-lg text-ink">{status === "locked" ? "This budget can't be edited" : "Budget not found"}</p>
        {status === "locked" && <p className="mt-1 text-sm text-muted">Only a draft budget can be edited. Revise a confirmed budget instead.</p>}
        <Link href={`/budgets/${id}`} className="mt-5 inline-block">
          <Button variant="ghost">Back to budget</Button>
        </Link>
      </div>
    );
  }
  if (status === "error" || !budget) {
    return (
      <div className="rounded-lg border border-line bg-surface px-6 py-12 text-center">
        <p className="text-sm text-oxblood">Couldn&rsquo;t load this budget.</p>
        <Button variant="ghost" onClick={load} className="mt-4 h-9 px-3 text-sm">
          Try again
        </Button>
      </div>
    );
  }
  return <BudgetForm budget={budget} />;
}
