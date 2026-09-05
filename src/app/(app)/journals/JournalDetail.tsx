"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { JournalForm } from "@/components/journals/JournalForm";
import type { Journal } from "@/lib/journals";

export function JournalDetail({ id }: { id: string }) {
  const [journal, setJournal] = useState<Journal | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "notfound" | "ready">("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await apiFetch<{ journal: Journal }>(`/api/journals/${id}`);
      setJournal(res.journal);
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
        <p className="font-display text-lg text-ink">Journal not found</p>
        <p className="mt-1 text-sm text-muted">The link may be out of date.</p>
        <Link href="/journals" className="mt-5 inline-block">
          <Button variant="ghost">Back to journals</Button>
        </Link>
      </Panel>
    );
  }

  if (status === "error" || !journal) {
    return (
      <Panel>
        <p className="text-sm text-oxblood">Couldn&rsquo;t load this journal.</p>
        <Button variant="ghost" onClick={load} className="mt-4 h-9 px-3 text-sm">
          Try again
        </Button>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="font-display text-xl text-ink">{journal.name}</h2>
      <JournalForm journal={journal} />
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
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-11 rounded-md bg-line/40" />
          ))}
        </div>
      </div>
    </div>
  );
}
