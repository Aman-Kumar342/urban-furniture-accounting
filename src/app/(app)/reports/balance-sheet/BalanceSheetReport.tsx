"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/format";
import { formatEntryDate, parseCents } from "@/lib/journalEntries";
import { EmptyReport, ReportHeader, StatementRow, StatementSection, StatementTotal } from "@/components/reports/ReportChrome";
import type { BalanceSheet } from "@/lib/reports";

export function BalanceSheetReport() {
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [data, setData] = useState<BalanceSheet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const y = Number(new URLSearchParams(window.location.search).get("year"));
    if (y >= 2000 && y <= 2100) setYear(y);
  }, []);

  const load = useCallback(async (y: number) => {
    setLoading(true);
    setError(null);
    try {
      setData(await apiFetch<BalanceSheet>(`/api/reports/balance-sheet?year=${y}`));
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

  const empty =
    data &&
    data.assets.length === 0 &&
    data.liabilities.length === 0 &&
    data.capital.length === 0 &&
    (parseCents(data.currentYearEarnings) ?? 0) === 0;

  return (
    <div className="space-y-6">
      <ReportHeader
        title="Balance Sheet"
        subtitle={data ? `As of ${formatEntryDate(data.asOf)}` : `As of Dec 31, ${year}`}
        year={year}
        onYear={setYear}
      />

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
        <EmptyReport message={`No posted transactions on or before ${formatEntryDate(data.asOf)}.`} />
      ) : (
        <div className="mx-auto max-w-2xl rounded-lg border border-line bg-surface p-8 print:border-0 print:p-0">
          <div className="space-y-8">
            <StatementSection title="Assets">
              {data.assets.map((l) => (
                <StatementRow key={l.code} name={l.name} amount={l.balance} />
              ))}
              <div className="pt-1">
                <StatementTotal label="Total assets" amount={data.totalAssets} strong />
              </div>
            </StatementSection>

            <StatementSection title="Liabilities">
              {data.liabilities.length === 0 ? (
                <p className="py-2 text-sm text-muted">No liabilities.</p>
              ) : (
                data.liabilities.map((l) => <StatementRow key={l.code} name={l.name} amount={l.balance} />)
              )}
              <div className="pt-1">
                <StatementTotal label="Total liabilities" amount={data.totalLiabilities} />
              </div>
            </StatementSection>

            <StatementSection title="Capital / Equity">
              {data.capital.map((l) => (
                <StatementRow key={l.code} name={l.name} amount={l.balance} />
              ))}
              <StatementRow name="Current year earnings" amount={data.currentYearEarnings} />
              <div className="pt-1">
                <StatementTotal label="Total liabilities + capital" amount={data.totalLiabilitiesAndCapital} strong />
              </div>
            </StatementSection>

            <div
              className={`flex items-center justify-between gap-4 rounded-md border px-3 py-2 text-sm ${
                data.balanced ? "border-income/20 bg-income/5 text-income" : "border-oxblood/30 bg-oxblood/5 text-oxblood"
              }`}
            >
              <span className="font-medium">
                {data.balanced ? "Balanced — assets equal liabilities plus capital." : "Out of balance"}
              </span>
              {!data.balanced && <span className="tnum">Difference {formatMoney(data.difference)}</span>}
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
      {[0, 1, 2].map((s) => (
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
