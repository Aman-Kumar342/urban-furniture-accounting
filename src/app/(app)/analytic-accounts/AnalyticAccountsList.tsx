"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { useView } from "@/lib/useView";
import {
  ANALYTIC_TYPES,
  ANALYTIC_TYPE_LABEL,
  ANALYTIC_TYPE_TONE,
  type AnalyticAccount,
  type AnalyticType,
} from "@/lib/analyticAccounts";

export function AnalyticAccountsList() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<AnalyticAccount[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | AnalyticType>("ALL");
  const [view, setView] = useView("view.analytics");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ analyticAccounts: AnalyticAccount[] }>("/api/analytic-accounts");
      setAccounts(res.analyticAccounts);
    } catch (e) {
      setError(
        e instanceof ApiRequestError && e.code === "FORBIDDEN"
          ? "You don't have access to analytic accounts."
          : "Couldn't load analytic accounts. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!accounts) return [];
    const needle = q.trim().toLowerCase();
    return accounts.filter((a) => {
      if (typeFilter !== "ALL" && a.type !== typeFilter) return false;
      if (!needle) return true;
      return a.name.toLowerCase().includes(needle);
    });
  }, [accounts, q, typeFilter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full max-w-xs sm:w-64">
            <Input
              type="search"
              placeholder="Search name…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search analytic accounts"
            />
          </div>
          <div className="w-40">
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as "ALL" | AnalyticType)} aria-label="Filter by type">
              <option value="ALL">All types</option>
              {ANALYTIC_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle value={view} onChange={setView} />
          <Link href="/analytic-accounts/new">
            <Button>New analytic account</Button>
          </Link>
        </div>
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
        <EmptyState isFiltered={q.trim().length > 0 || typeFilter !== "ALL"} />
      ) : view === "kanban" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a) => (
            <Link
              key={a.id}
              href={`/analytic-accounts/${a.id}`}
              className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface p-4 transition-colors hover:border-pine/40 hover:bg-paper/40"
            >
              <span className="truncate font-medium text-ink">{a.name}</span>
              <Badge tone={ANALYTIC_TYPE_TONE[a.type]}>{ANALYTIC_TYPE_LABEL[a.type]}</Badge>
            </Link>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium text-muted">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr
                    key={a.id}
                    onClick={() => router.push(`/analytic-accounts/${a.id}`)}
                    className="cursor-pointer border-b border-line last:border-0 transition-colors hover:bg-paper/60"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/analytic-accounts/${a.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium text-ink hover:text-pine hover:underline"
                      >
                        {a.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={ANALYTIC_TYPE_TONE[a.type]}>{ANALYTIC_TYPE_LABEL[a.type]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-4 py-2.5 text-xs text-muted">
            {filtered.length} {filtered.length === 1 ? "analytic account" : "analytic accounts"}
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
        <p className="text-sm text-muted">No analytic accounts match your search.</p>
      ) : (
        <>
          <p className="font-display text-lg text-ink">No analytic accounts yet</p>
          <p className="mt-1 text-sm text-muted">Tag documents and budgets with analytic accounts like &ldquo;Furniture&rdquo; or &ldquo;Project 1&rdquo;.</p>
          <Link href="/analytic-accounts/new" className="mt-5 inline-block">
            <Button>New analytic account</Button>
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
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 border-b border-line px-4 py-3.5 last:border-0">
          <div className="h-3 w-44 rounded bg-line/50" />
          <div className="ml-auto h-5 w-16 rounded-full bg-line/40" />
        </div>
      ))}
    </div>
  );
}
