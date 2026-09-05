"use client";

import type { ReactNode } from "react";
import { Select } from "@/components/ui/Select";
import { formatMoney } from "@/lib/format";
import { reportYears } from "@/lib/reports";

// Header for a financial statement: Fraunces title, sub-line, a year selector and a Print action.
// Controls carry `print:hidden` so a printed page shows only the statement.
export function ReportHeader({
  title,
  subtitle,
  year,
  onYear,
}: {
  title: string;
  subtitle: string;
  year: number;
  onYear: (y: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl text-ink">{title}</h1>
        <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2 print:hidden">
        <label className="text-sm text-muted" htmlFor="report-year">
          Year
        </label>
        <div className="w-28">
          <Select id="report-year" value={String(year)} onChange={(e) => onYear(Number(e.target.value))}>
            {reportYears().map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex h-11 items-center gap-1.5 rounded-md border border-line px-3 text-sm font-medium text-ink transition-colors hover:bg-line/50"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 9V4h12v5M6 18H4v-6h16v6h-2M8 14h8v6H8z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Print
        </button>
      </div>
    </div>
  );
}

// A ruled section: heading, the account rows (children), and a total line.
export function StatementSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="border-b border-ink/15 pb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">{title}</h2>
      <div className="divide-y divide-line">{children}</div>
    </section>
  );
}

export function StatementRow({ name, code, amount }: { name: string; code?: string; amount: string }) {
  return (
    <div className="flex items-center justify-between gap-6 py-2 text-sm">
      <span className="text-ink">
        {code && <span className="tnum mr-2 text-line">{code}</span>}
        {name}
      </span>
      <span className="tnum text-ink">{formatMoney(amount)}</span>
    </div>
  );
}

export function StatementTotal({ label, amount, strong }: { label: string; amount: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-6 border-t py-2.5 text-sm ${strong ? "border-ink/40" : "border-line"}`}>
      <span className={strong ? "font-semibold text-ink" : "font-medium text-muted"}>{label}</span>
      <span className={`tnum ${strong ? "font-semibold text-ink" : "font-medium text-ink"}`}>{formatMoney(amount)}</span>
    </div>
  );
}

export function EmptyReport({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-14 text-center">
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}
