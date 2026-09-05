"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/format";
import {
  ENTRY_STATE_LABEL,
  ENTRY_STATE_TONE,
  SOURCE_TYPE_LABEL,
  formatEntryDate,
  type JournalEntryDetail as Entry,
} from "@/lib/journalEntries";

export function JournalEntryDetail({ id }: { id: string }) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "notfound" | "ready">("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await apiFetch<{ entry: Entry }>(`/api/journal-entries/${id}`);
      setEntry(res.entry);
      setStatus("ready");
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
        <p className="font-display text-lg text-ink">Entry not found</p>
        <p className="mt-1 text-sm text-muted">The link may be out of date.</p>
        <Link href="/journal-entries" className="mt-5 inline-block">
          <Button variant="ghost">Back to journal entries</Button>
        </Link>
      </Panel>
    );
  }

  if (status === "error" || !entry) {
    return (
      <Panel>
        <p className="text-sm text-oxblood">Couldn&rsquo;t load this entry.</p>
        <Button variant="ghost" onClick={load} className="mt-4 h-9 px-3 text-sm">
          Try again
        </Button>
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="tnum font-display text-xl text-ink">{entry.number}</h2>
            <Badge tone={ENTRY_STATE_TONE[entry.state]}>{ENTRY_STATE_LABEL[entry.state]}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            {SOURCE_TYPE_LABEL[entry.sourceType]} entry · posted amount{" "}
            <span className="tnum text-ink">{formatMoney(entry.amount)}</span>
          </p>
        </div>
      </div>

      <dl className="grid gap-4 rounded-lg border border-line bg-surface p-6 sm:grid-cols-3">
        <Field label="Journal" value={entry.journal?.name ?? "—"} />
        <Field label="Accounting date" value={formatEntryDate(entry.date)} />
        <Field label="Partner" value={entry.partner?.name ?? "—"} />
        <Field label="Reference" value={entry.reference || "—"} />
      </dl>

      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium text-muted">
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium">Partner</th>
                <th className="px-4 py-3 font-medium">Analytic</th>
                <th className="px-4 py-3 text-right font-medium">Debit</th>
                <th className="px-4 py-3 text-right font-medium">Credit</th>
              </tr>
            </thead>
            <tbody>
              {entry.items.map((it) => (
                <tr key={it.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    {it.account ? (
                      <span>
                        <span className="tnum text-line">{it.account.code}</span>{" "}
                        <span className="text-ink">{it.account.name}</span>
                      </span>
                    ) : (
                      <span className="text-line">—</span>
                    )}
                    {it.label && <span className="block text-xs text-muted">{it.label}</span>}
                  </td>
                  <td className="px-4 py-3 text-muted">{it.partner?.name || <span className="text-line">—</span>}</td>
                  <td className="px-4 py-3 text-muted">{it.analyticAccount?.name || <span className="text-line">—</span>}</td>
                  <td className="tnum px-4 py-3 text-right text-ink">
                    {Number(it.debit) > 0 ? formatMoney(it.debit) : <span className="text-line">—</span>}
                  </td>
                  <td className="tnum px-4 py-3 text-right text-ink">
                    {Number(it.credit) > 0 ? formatMoney(it.credit) : <span className="text-line">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-line bg-paper/40 font-medium">
                <td className="px-4 py-3 text-muted" colSpan={3}>
                  Totals
                </td>
                <td className="tnum px-4 py-3 text-right text-ink">{formatMoney(entry.amount)}</td>
                <td className="tnum px-4 py-3 text-right text-ink">{formatMoney(entry.amount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted">
        Posted entries are part of the permanent ledger and can&rsquo;t be edited or deleted.
      </p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{value}</dd>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-line bg-surface px-6 py-12 text-center">{children}</div>;
}

function DetailSkeleton() {
  return (
    <div className="space-y-5">
      <div className="h-7 w-40 rounded bg-line/50" />
      <div className="grid gap-4 rounded-lg border border-line bg-surface p-6 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 rounded bg-line/40" />
        ))}
      </div>
      <div className="h-40 rounded-lg border border-line bg-surface" />
    </div>
  );
}
