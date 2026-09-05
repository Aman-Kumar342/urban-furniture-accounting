"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/format";
import { EmptyReport, ReportHeader, StatementRow, StatementSection, StatementTotal } from "@/components/reports/ReportChrome";
import { parseCents } from "@/lib/journalEntries";
import type { ProfitAndLoss } from "@/lib/reports";

export function ProfitLossReport() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [data, setData] = useState<ProfitAndLoss | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Pick up ?year= on mount (client only), so a shared link opens the right year.
  useEffect(() => {
    const y = Number(new URLSearchParams(window.location.search).get("year"));
    if (y >= 2000 && y <= 2100) setYear(y);
  }, []);

  const load = useCallback(async (y: number) => {
    setLoading(true);
    setError(null);
    try {
      setData(await apiFetch<ProfitAndLoss>(`/api/reports/profit-loss?year=${y}`));
    } catch (e) {
      setError(
        e instanceof ApiRequestError && e.code === "FORBIDDEN"
          ? "You don't have access to this report."
          : "Couldn't load the report. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(year);
    if (typeof window !== "undefined") window.history.replaceState(null, "", `?year=${year}`);
  }, [year, load]);

  const empty = data && data.income.length === 0 && data.expenses.length === 0;
  const netNegative = data ? (parseCents(data.netIncome) ?? 0) < 0 : false;

  return (
    <div className="space-y-6">
      <ReportHeader title="Profit &amp; Loss" subtitle={`For the year ${year}`} year={year} onYear={setYear} />

      {loading ? (
        <ReportSkeleton />
      ) : error ? (
        <div className="rounded-lg border border-line bg-surface p-8 text-center">
          <p className="text-sm text-oxblood">{error}</p>
          <Button variant="ghost" onClick={() => load(year)} className="mt-4 h-9 px-3 text-sm">
            Try again
          </Button>
        </div>
      ) : !data ? null : empty ? (
        <EmptyReport message={`No posted transactions for ${year}.`} />
      ) : (
        <div className="mx-auto max-w-2xl rounded-lg border border-line bg-surface p-8 print:border-0 print:p-0">
          <div className="space-y-8">
            <StatementSection title="Income">
              {data.income.map((l) => (
                <StatementRow key={l.code} name={l.name} amount={l.balance} />
              ))}
              <div className="pt-1">
                <StatementTotal label="Total income" amount={data.totalIncome} />
              </div>
            </StatementSection>

            <StatementSection title="Expenses">
              {data.expenses.length === 0 ? (
                <p className="py-2 text-sm text-muted">No expenses.</p>
              ) : (
                data.expenses.map((l) => <StatementRow key={l.code} name={l.name} amount={l.balance} />)
              )}
              <div className="pt-1">
                <StatementTotal label="Total expenses" amount={data.totalExpenses} />
              </div>
            </StatementSection>

            <div className="flex items-center justify-between gap-6 border-t-2 border-ink/40 pt-4">
              <span className="font-display text-lg text-ink">Net income</span>
              <span className={`tnum font-display text-lg ${netNegative ? "text-oxblood" : "text-income"}`}>
                {formatMoney(data.netIncome)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 rounded-lg border border-line bg-surface p-8">
      {[0, 1].map((s) => (
        <div key={s} className="space-y-3">
          <div className="h-3 w-24 rounded bg-line/60" />
          {[0, 1].map((i) => (
            <div key={i} className="flex justify-between">
              <div className="h-3 w-40 rounded bg-line/40" />
              <div className="h-3 w-20 rounded bg-line/40" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
