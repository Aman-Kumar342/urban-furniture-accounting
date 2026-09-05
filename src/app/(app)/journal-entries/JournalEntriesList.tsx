"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/format";
import {
  ENTRY_STATE_LABEL,
  ENTRY_STATE_TONE,
  formatEntryDate,
  type JournalEntryRow,
} from "@/lib/journalEntries";

export function JournalEntriesList() {
  const router = useRouter();
  const [entries, setEntries] = useState<JournalEntryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ entries: JournalEntryRow[] }>("/api/journal-entries");
      setEntries(res.entries);
    } catch (e) {
      setError(
        e instanceof ApiRequestError && e.code === "FORBIDDEN"
          ? "You don't have access to journal entries."
          : "Couldn't load journal entries. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!entries) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return entries;
    return entries.filter((e) =>
      [e.number, e.partner?.name, e.journal?.name, e.reference].filter(Boolean).some((v) =>
        v!.toLowerCase().includes(needle),
      ),
    );
  }, [entries, q]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-full max-w-xs">
          <Input
            type="search"
            placeholder="Search number, partner, journal…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search journal entries"
          />
        </div>
        <Link href="/journal-entries/new">
          <Button>New entry</Button>
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
        <EmptyState hasQuery={q.trim().length > 0} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium text-muted">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Number</th>
                  <th className="px-4 py-3 font-medium">Partner</th>
                  <th className="px-4 py-3 font-medium">Journal</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr
                    key={e.id}
                    onClick={() => router.push(`/journal-entries/${e.id}`)}
                    className="cursor-pointer border-b border-line last:border-0 transition-colors hover:bg-paper/60"
                  >
                    <td className="px-4 py-3 text-muted">{formatEntryDate(e.date)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/journal-entries/${e.id}`}
                        onClick={(ev) => ev.stopPropagation()}
                        className="tnum font-medium text-ink hover:text-pine hover:underline"
                      >
                        {e.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{e.partner?.name || <span className="text-line">—</span>}</td>
                    <td className="px-4 py-3 text-muted">{e.journal?.name || <span className="text-line">—</span>}</td>
                    <td className="px-4 py-3 tnum text-right text-ink">{formatMoney(e.amount)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={ENTRY_STATE_TONE[e.state]}>{ENTRY_STATE_LABEL[e.state]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-4 py-2.5 text-xs text-muted">
            {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
            {entries && filtered.length !== entries.length ? ` of ${entries.length}` : ""}
            {entries && entries.length >= 100 ? " · showing the latest 100" : ""}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-14 text-center">
      {hasQuery ? (
        <p className="text-sm text-muted">No entries match your search.</p>
      ) : (
        <>
          <p className="font-display text-lg text-ink">No journal entries yet</p>
          <p className="mt-1 text-sm text-muted">
            Post a manual entry, or confirm invoices, bills, and payments to generate entries automatically.
          </p>
          <Link href="/journal-entries/new" className="mt-5 inline-block">
            <Button>New entry</Button>
          </Link>
        </>
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
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-4 border-b border-line px-4 py-3.5 last:border-0">
          <div className="h-3 w-24 rounded bg-line/50" />
          <div className="h-3 w-28 rounded bg-line/50" />
          <div className="ml-auto h-3 w-16 rounded bg-line/40" />
          <div className="h-5 w-16 rounded-full bg-line/40" />
        </div>
      ))}
    </div>
  );
}
