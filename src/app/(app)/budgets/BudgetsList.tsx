"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/format";
import { formatEntryDate, parseCents } from "@/lib/journalEntries";
import { centsToDecimal } from "@/lib/documents";
import { BUDGET_STATE_LABEL, BUDGET_STATE_TONE, type BudgetRow } from "@/lib/budgets";

const committedTotal = (b: BudgetRow) =>
  centsToDecimal(b.lines.reduce((s, l) => s + (parseCents(l.committedAmount) ?? 0), 0));

export function BudgetsList() {
  const router = useRouter();
  const [budgets, setBudgets] = useState<BudgetRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ budgets: BudgetRow[] }>("/api/budgets");
      setBudgets(res.budgets);
    } catch (e) {
      setError(
        e instanceof ApiRequestError && e.code === "FORBIDDEN"
          ? "You don't have access to budgets."
          : "Couldn't load budgets. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!budgets) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return budgets;
    return budgets.filter((b) => b.name.toLowerCase().includes(needle));
  }, [budgets, q]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-full max-w-xs">
          <Input type="search" placeholder="Search budgets…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search budgets" />
        </div>
        <Link href="/budgets/new">
          <Button>New budget</Button>
        </Link>
      </div>

      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <div className="rounded-lg border border-line bg-surface p-8 text-center">
          <p className="text-sm text-oxblood">{error}</p>
          <Button variant="ghost" onClick={load} className="mt-4 h-9 px-3 text-sm">
            Try again
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-14 text-center">
          {q.trim() ? (
            <p className="text-sm text-muted">No budgets match your search.</p>
          ) : (
            <>
              <p className="font-display text-lg text-ink">No budgets yet</p>
              <p className="mt-1 text-sm text-muted">Plan committed amounts per analytic account and track what&rsquo;s achieved.</p>
              <Link href="/budgets/new" className="mt-5 inline-block">
                <Button>New budget</Button>
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium text-muted">
                  <th className="px-4 py-3 font-medium">Budget</th>
                  <th className="px-4 py-3 font-medium">Period</th>
                  <th className="px-4 py-3 text-right font-medium">Committed</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} onClick={() => router.push(`/budgets/${b.id}`)} className="cursor-pointer border-b border-line last:border-0 transition-colors hover:bg-paper/60">
                    <td className="px-4 py-3">
                      <Link href={`/budgets/${b.id}`} onClick={(e) => e.stopPropagation()} className="font-medium text-ink hover:text-pine hover:underline">
                        {b.name}
                      </Link>
                      {b.revisionOf && <span className="ml-2 text-xs text-muted">rev. of {b.revisionOf.name}</span>}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formatEntryDate(b.periodStart)} – {formatEntryDate(b.periodEnd)}
                    </td>
                    <td className="tnum px-4 py-3 text-right text-ink">{formatMoney(committedTotal(b))}</td>
                    <td className="px-4 py-3">
                      <Badge tone={BUDGET_STATE_TONE[b.state]}>{BUDGET_STATE_LABEL[b.state]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-4 py-2.5 text-xs text-muted">
            {filtered.length} {filtered.length === 1 ? "budget" : "budgets"}
          </div>
        </div>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="border-b border-line px-4 py-3">
        <div className="h-3 w-40 rounded bg-line/50" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-4 border-b border-line px-4 py-3.5 last:border-0">
          <div className="h-3 w-40 rounded bg-line/50" />
          <div className="ml-auto h-3 w-24 rounded bg-line/40" />
          <div className="h-5 w-16 rounded-full bg-line/40" />
        </div>
      ))}
    </div>
  );
}
