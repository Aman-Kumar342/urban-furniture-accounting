"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { AnalyticAccountForm } from "@/components/analyticAccounts/AnalyticAccountForm";
import { formatMoney } from "@/lib/format";
import { formatEntryDate } from "@/lib/journalEntries";
import { BUDGET_STATE_LABEL, BUDGET_STATE_TONE, type BudgetReport, type BudgetRow } from "@/lib/budgets";
import type { AnalyticAccount } from "@/lib/analyticAccounts";

interface Usage {
  budgetId: string;
  budgetName: string;
  state: BudgetRow["state"];
  periodStart: string;
  periodEnd: string;
  committed: string;
  achieved: string;
}

export function AnalyticAccountDetail({ id }: { id: string }) {
  const [account, setAccount] = useState<AnalyticAccount | null>(null);
  const [usage, setUsage] = useState<Usage[] | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "notfound" | "ready">("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await apiFetch<{ analyticAccount: AnalyticAccount }>(`/api/analytic-accounts/${id}`);
      setAccount(res.analyticAccount);
      setStatus("ready");
      // The budgets that use this analytic account, with committed/achieved for its line.
      try {
        const { budgets } = await apiFetch<{ budgets: BudgetRow[] }>("/api/budgets");
        const reports = await Promise.all(
          budgets.map((b) => apiFetch<BudgetReport>(`/api/budgets/${b.id}/report`).then((r) => ({ b, r })).catch(() => null)),
        );
        const rows: Usage[] = [];
        for (const item of reports) {
          if (!item) continue;
          const line = item.r.lines.find((l) => l.analyticAccountId === id);
          if (!line) continue;
          rows.push({
            budgetId: item.b.id,
            budgetName: item.b.name,
            state: item.b.state,
            periodStart: item.b.periodStart,
            periodEnd: item.b.periodEnd,
            committed: line.committed,
            achieved: line.achieved,
          });
        }
        setUsage(rows);
      } catch {
        setUsage([]);
      }
    } catch (e) {
      setStatus(e instanceof ApiRequestError && e.code === "NOT_FOUND" ? "notfound" : "error");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (status === "loading") return <DetailSkeleton />;

  if (status === "notfound") {
    return (
      <Panel>
        <p className="font-display text-lg text-ink">Analytic account not found</p>
        <p className="mt-1 text-sm text-muted">The link may be out of date.</p>
        <Link href="/analytic-accounts" className="mt-5 inline-block">
          <Button variant="ghost">Back to analytic accounts</Button>
        </Link>
      </Panel>
    );
  }

  if (status === "error" || !account) {
    return (
      <Panel>
        <p className="text-sm text-oxblood">Couldn&rsquo;t load this analytic account.</p>
        <Button variant="ghost" onClick={load} className="mt-4 h-9 px-3 text-sm">
          Try again
        </Button>
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      <h2 className="font-display text-xl text-ink">{account.name}</h2>
      <AnalyticAccountForm account={account} />

      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <div className="border-b border-line px-4 py-3">
          <p className="text-sm font-medium text-ink">Budgets using this analytic account</p>
        </div>
        {usage === null ? (
          <div className="p-4">
            <div className="h-4 w-48 rounded bg-line/50" />
          </div>
        ) : usage.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted">Not used in any budget yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium text-muted">
                  <th className="px-4 py-3 font-medium">Budget</th>
                  <th className="px-4 py-3 font-medium">Start date</th>
                  <th className="px-4 py-3 font-medium">End date</th>
                  <th className="px-4 py-3 text-right font-medium">Committed</th>
                  <th className="px-4 py-3 text-right font-medium">Achieved</th>
                </tr>
              </thead>
              <tbody>
                {usage.map((u) => (
                  <tr key={u.budgetId} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <Link href={`/budgets/${u.budgetId}`} className="font-medium text-ink hover:text-pine hover:underline">
                        {u.budgetName}
                      </Link>{" "}
                      <Badge tone={BUDGET_STATE_TONE[u.state]}>{BUDGET_STATE_LABEL[u.state]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted">{formatEntryDate(u.periodStart)}</td>
                    <td className="px-4 py-3 text-muted">{formatEntryDate(u.periodEnd)}</td>
                    <td className="tnum px-4 py-3 text-right text-ink">{formatMoney(u.committed)}</td>
                    <td className="tnum px-4 py-3 text-right text-income">{formatMoney(u.achieved)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-line bg-surface px-6 py-12 text-center">{children}</div>;
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-6 w-48 rounded bg-line/50" />
      <div className="space-y-5 rounded-lg border border-line bg-surface p-6">
        <div className="h-11 rounded-md bg-line/40" />
        <div className="h-11 w-1/2 rounded-md bg-line/40" />
      </div>
    </div>
  );
}
