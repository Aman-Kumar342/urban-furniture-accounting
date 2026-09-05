"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { JOURNAL_TYPE_LABEL, JOURNAL_TYPE_TONE, type Journal } from "@/lib/journals";

export function JournalsList() {
  const router = useRouter();
  const [journals, setJournals] = useState<Journal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ journals: Journal[] }>("/api/journals");
      setJournals(res.journals);
    } catch (e) {
      setError(
        e instanceof ApiRequestError && e.code === "FORBIDDEN"
          ? "You don't have access to journals."
          : "Couldn't load journals. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!journals) return [];
    const needle = q.trim().toLowerCase();
    if (!needle) return journals;
    return journals.filter((j) =>
      [j.name, JOURNAL_TYPE_LABEL[j.type], j.defaultAccount?.name].filter(Boolean).some((v) =>
        v!.toLowerCase().includes(needle),
      ),
    );
  }, [journals, q]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="w-full max-w-xs">
          <Input
            type="search"
            placeholder="Search name, type, account…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search journals"
          />
        </div>
        <Link href="/journals/new">
          <Button>New journal</Button>
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
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium text-muted">
                  <th className="px-4 py-3 font-medium">Journal name</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Default account</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((j) => (
                  <tr
                    key={j.id}
                    onClick={() => router.push(`/journals/${j.id}`)}
                    className="cursor-pointer border-b border-line last:border-0 transition-colors hover:bg-paper/60"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/journals/${j.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium text-ink hover:text-pine hover:underline"
                      >
                        {j.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={JOURNAL_TYPE_TONE[j.type]}>{JOURNAL_TYPE_LABEL[j.type]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {j.defaultAccount ? (
                        <span>
                          <span className="tnum text-line">{j.defaultAccount.code}</span>{" "}
                          <span className="text-ink">{j.defaultAccount.name}</span>
                        </span>
                      ) : (
                        <span className="text-line">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-4 py-2.5 text-xs text-muted">
            {filtered.length} {filtered.length === 1 ? "journal" : "journals"}
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
        <p className="text-sm text-muted">No journals match your search.</p>
      ) : (
        <>
          <p className="font-display text-lg text-ink">No journals yet</p>
          <p className="mt-1 text-sm text-muted">Journals group postings by type and set a default account.</p>
          <Link href="/journals/new" className="mt-5 inline-block">
            <Button>New journal</Button>
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
          <div className="h-3 w-32 rounded bg-line/50" />
          <div className="h-5 w-16 rounded-full bg-line/40" />
          <div className="ml-auto h-3 w-40 rounded bg-line/40" />
        </div>
      ))}
    </div>
  );
}
