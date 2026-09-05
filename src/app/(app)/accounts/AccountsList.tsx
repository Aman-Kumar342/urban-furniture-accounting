"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import {
  ACCOUNT_TYPES,
  ACCOUNT_TYPE_LABEL,
  ACCOUNT_TYPE_TONE,
  buildAccountRows,
  type Account,
  type AccountType,
} from "@/lib/accounts";

export function AccountsList() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | AccountType>("ALL");
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(async (includeArchived: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ accounts: Account[] }>(
        `/api/accounts${includeArchived ? "?includeArchived=true" : ""}`,
      );
      setAccounts(res.accounts);
    } catch (e) {
      setError(
        e instanceof ApiRequestError && e.code === "FORBIDDEN"
          ? "You don't have access to the chart of accounts."
          : "Couldn't load accounts. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(showArchived);
  }, [load, showArchived]);

  const isFiltered = q.trim().length > 0 || typeFilter !== "ALL";

  // Tree by default; a flat, code-ordered list while searching/filtering (so a matching child
  // isn't hidden by a non-matching parent).
  const rows = useMemo(() => {
    if (!accounts) return [];
    if (!isFiltered) return buildAccountRows(accounts);
    const needle = q.trim().toLowerCase();
    return accounts
      .filter((a) => {
        if (typeFilter !== "ALL" && a.type !== typeFilter) return false;
        if (!needle) return true;
        return a.name.toLowerCase().includes(needle) || a.code.toLowerCase().includes(needle);
      })
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((account) => ({ account, depth: 0 }));
  }, [accounts, q, typeFilter, isFiltered]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full max-w-xs sm:w-56">
            <Input
              type="search"
              placeholder="Search code or name…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search accounts"
            />
          </div>
          <div className="w-40">
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as "ALL" | AccountType)} aria-label="Filter by type">
              <option value="ALL">All types</option>
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="h-4 w-4 rounded border-line accent-pine"
            />
            Show archived
          </label>
        </div>
        <Link href="/accounts/new">
          <Button>New account</Button>
        </Link>
      </div>

      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <div className="rounded-lg border border-line bg-surface p-8 text-center">
          <p className="text-sm text-oxblood">{error}</p>
          <Button variant="ghost" onClick={() => load(showArchived)} className="mt-4 h-9 px-3 text-sm">
            Try again
          </Button>
        </div>
      ) : rows.length === 0 ? (
        <EmptyState isFiltered={isFiltered} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium text-muted">
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Account name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ account: a, depth }) => (
                  <tr
                    key={a.id}
                    onClick={() => router.push(`/accounts/${a.id}`)}
                    className="cursor-pointer border-b border-line last:border-0 transition-colors hover:bg-paper/60"
                  >
                    <td className="px-4 py-3 tnum text-muted">{a.code}</td>
                    <td className="px-4 py-3">
                      <span style={{ paddingLeft: depth * 20 }} className="inline-flex items-center">
                        {depth > 0 && <span className="mr-2 text-line" aria-hidden="true">└</span>}
                        <Link
                          href={`/accounts/${a.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className={`font-medium hover:text-pine hover:underline ${a.isArchived ? "text-muted" : "text-ink"}`}
                        >
                          {a.name}
                        </Link>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={ACCOUNT_TYPE_TONE[a.type]}>{ACCOUNT_TYPE_LABEL[a.type]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {a.isArchived ? <Badge tone="neutral">Archived</Badge> : <span className="text-line">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-4 py-2.5 text-xs text-muted">
            {rows.length} {rows.length === 1 ? "account" : "accounts"}
            {!isFiltered ? " · tree view" : ""}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ isFiltered }: { isFiltered: boolean }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-14 text-center">
      {isFiltered ? (
        <p className="text-sm text-muted">No accounts match your search.</p>
      ) : (
        <>
          <p className="font-display text-lg text-ink">No accounts yet</p>
          <p className="mt-1 text-sm text-muted">Build your chart of accounts to post journals against.</p>
          <Link href="/accounts/new" className="mt-5 inline-block">
            <Button>New account</Button>
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
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-4 border-b border-line px-4 py-3.5 last:border-0">
          <div className="h-3 w-12 rounded bg-line/50" />
          <div className="h-3 w-44 rounded bg-line/50" />
          <div className="ml-auto h-3 w-16 rounded bg-line/40" />
        </div>
      ))}
    </div>
  );
}
