"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { BudgetDonut } from "@/components/budgets/BudgetDonut";
import { EmptyReport } from "@/components/reports/ReportChrome";
import { formatMoney } from "@/lib/format";
import { formatEntryDate, parseCents } from "@/lib/journalEntries";
import { centsToDecimal } from "@/lib/documents";
import { BUDGET_STATE_LABEL, BUDGET_STATE_TONE, type BudgetReport as Report, type BudgetRow } from "@/lib/budgets";

const diff = (a: string, b: string) => centsToDecimal((parseCents(a) ?? 0) - (parseCents(b) ?? 0));

export function BudgetReport() {
  const [reports, setReports] = useState<(Report & { id: string; state: string })[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { budgets } = await apiFetch<{ budgets: BudgetRow[] }>("/api/budgets");
      // No single "all budgets" report endpoint — aggregate each budget's report (bounded by the
      // number of budgets), in parallel.
      const reps = await Promise.all(
        budgets.map(async (b) => {
          const r = await apiFetch<Report>(`/api/budgets/${b.id}/report`);
          return { ...r, id: b.id, state: b.state };
        }),
      );
      setReports(reps);
    } catch (e) {
      setError(
        e instanceof ApiRequestError && e.code === "FORBIDDEN"
          ? "You don't have access to this report."
          : "Couldn't load the budget report. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const grandCommitted = reports ? centsToDecimal(reports.reduce((s, r) => s + (parseCents(r.totalCommitted) ?? 0), 0)) : "0";
  const grandAchieved = reports ? centsToDecimal(reports.reduce((s, r) => s + (parseCents(r.totalAchieved) ?? 0), 0)) : "0";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-ink">Budget Report</h1>
          <p className="mt-0.5 text-sm text-muted">Committed vs achieved across all budgets</p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-11 items-center gap-1.5 rounded-md border border-line px-3 text-sm font-medium text-ink transition-colors hover:bg-line/50 print:hidden"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 9V4h12v5M6 18H4v-6h16v6h-2M8 14h8v6H8z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Print
        </button>
      </div>

      {loading ? (
        <div className="h-64 rounded-lg border border-line bg-surface" />
      ) : error ? (
        <div className="rounded-lg border border-line bg-surface p-8 text-center">
          <p className="text-sm text-oxblood">{error}</p>
          <Button variant="ghost" onClick={load} className="mt-4 h-9 px-3 text-sm">
            Try again
          </Button>
        </div>
      ) : !reports || reports.length === 0 ? (
        <EmptyReport message="No budgets yet. Create a budget to track committed and achieved amounts." />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-6 rounded-lg border border-line bg-surface p-6">
            <BudgetDonut committed={grandCommitted} achieved={grandAchieved} />
            <dl className="grid flex-1 grid-cols-3 gap-4">
              <Metric label="Committed" value={formatMoney(grandCommitted)} />
              <Metric label="Achieved" value={formatMoney(grandAchieved)} tone="income" />
              <Metric label="Amount to achieve" value={formatMoney(diff(grandCommitted, grandAchieved))} />
            </dl>
          </div>

          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs font-medium text-muted">
                    <th className="px-4 py-3 font-medium">Budget</th>
                    <th className="px-4 py-3 font-medium">Period</th>
                    <th className="px-4 py-3 text-right font-medium">Committed</th>
                    <th className="px-4 py-3 text-right font-medium">Achieved</th>
                    <th className="px-4 py-3 text-right font-medium">To achieve</th>
                    <th className="px-4 py-3 text-right font-medium">Achieved %</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => {
                    const cc = parseCents(r.totalCommitted) ?? 0;
                    const ac = parseCents(r.totalAchieved) ?? 0;
                    const pct = cc > 0 ? Math.round((ac / cc) * 100) : 0;
                    return (
                      <tr key={r.id} className="border-b border-line last:border-0">
                        <td className="px-4 py-3">
                          <Link href={`/budgets/${r.id}`} className="font-medium text-ink hover:text-pine hover:underline">
                            {r.name}
                          </Link>{" "}
                          <Badge tone={BUDGET_STATE_TONE[r.state as keyof typeof BUDGET_STATE_TONE]}>
                            {BUDGET_STATE_LABEL[r.state as keyof typeof BUDGET_STATE_LABEL]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {formatEntryDate(r.periodStart)} – {formatEntryDate(r.periodEnd)}
                        </td>
                        <td className="tnum px-4 py-3 text-right text-ink">{formatMoney(r.totalCommitted)}</td>
                        <td className="tnum px-4 py-3 text-right text-income">{formatMoney(r.totalAchieved)}</td>
                        <td className="tnum px-4 py-3 text-right text-muted">{formatMoney(diff(r.totalCommitted, r.totalAchieved))}</td>
                        <td className="tnum px-4 py-3 text-right text-ink">{pct}%</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-line bg-paper/40 font-medium">
                    <td className="px-4 py-3 text-muted" colSpan={2}>
                      Total
                    </td>
                    <td className="tnum px-4 py-3 text-right text-ink">{formatMoney(grandCommitted)}</td>
                    <td className="tnum px-4 py-3 text-right text-income">{formatMoney(grandAchieved)}</td>
                    <td className="tnum px-4 py-3 text-right text-muted">{formatMoney(diff(grandCommitted, grandAchieved))}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "income" }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className={`tnum mt-0.5 text-lg font-semibold ${tone === "income" ? "text-income" : "text-ink"}`}>{value}</dd>
    </div>
  );
}
