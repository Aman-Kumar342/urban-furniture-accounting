"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/Button";

interface DashboardData {
  sales: { all: number; confirmed: number; draft: number };
  purchase: { all: number; confirmed: number; draft: number };
  budget: null | { achieved: number; budget: number; committed: number };
}

type Tone = "ink" | "income" | "muted";
interface Tile {
  label: string;
  value: number;
  tone?: Tone;
}

const TONE: Record<Tone, string> = { ink: "text-ink", income: "text-income", muted: "text-muted" };

export function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await apiFetch<DashboardData>("/api/dashboard"));
    } catch (e) {
      if (e instanceof ApiRequestError) {
        setError(
          e.code === "FORBIDDEN"
            ? "You don't have access to the dashboard."
            : e.message,
        );
      } else {
        setError("Couldn't load the dashboard. Check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="rounded-lg border border-line bg-surface p-8 text-center">
        <p className="text-sm text-oxblood">{error}</p>
        <Button variant="ghost" onClick={load} className="mt-4 h-9 px-3 text-sm">
          Try again
        </Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button variant="ghost" onClick={load} className="h-9 px-3 text-sm text-muted">
          Refresh
        </Button>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <MetricCard
          title="Sales orders"
          tiles={[
            { label: "All", value: data.sales.all },
            { label: "Confirmed", value: data.sales.confirmed, tone: "income" },
            { label: "Draft", value: data.sales.draft, tone: "muted" },
          ]}
        />
        <MetricCard
          title="Purchase orders"
          tiles={[
            { label: "All", value: data.purchase.all },
            { label: "Confirmed", value: data.purchase.confirmed, tone: "income" },
            { label: "Draft", value: data.purchase.draft, tone: "muted" },
          ]}
        />
      </div>

      <BudgetPanel budget={data.budget} />
    </div>
  );
}

function MetricCard({ title, tiles }: { title: string; tiles: Tile[] }) {
  return (
    <section className="rounded-lg border border-line bg-surface shadow-[0_1px_2px_rgba(33,28,24,0.04)]">
      <header className="border-b border-line px-5 py-3">
        <h2 className="text-sm font-medium text-ink">{title}</h2>
      </header>
      <div className="grid grid-cols-3 divide-x divide-line">
        {tiles.map((t) => (
          <div key={t.label} className="px-5 py-5 text-center">
            <p className={`tnum font-display text-3xl leading-none ${TONE[t.tone ?? "ink"]}`}>{t.value}</p>
            <p className="mt-2 text-xs text-muted">{t.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// The dashboard's budget figures are not implemented server-side (GET /api/dashboard returns
// budget: null). We show that honestly rather than fabricate Achieved / Budget / Committed.
function BudgetPanel({ budget }: { budget: DashboardData["budget"] }) {
  if (budget) {
    return (
      <section className="rounded-lg border border-line bg-surface shadow-[0_1px_2px_rgba(33,28,24,0.04)]">
        <header className="border-b border-line px-5 py-3">
          <h2 className="text-sm font-medium text-ink">Budget</h2>
        </header>
        <div className="grid grid-cols-3 divide-x divide-line">
          <div className="px-5 py-5 text-center">
            <p className="tnum font-display text-3xl leading-none text-income">{budget.achieved}</p>
            <p className="mt-2 text-xs text-muted">Achieved</p>
          </div>
          <div className="px-5 py-5 text-center">
            <p className="tnum font-display text-3xl leading-none text-ink">{budget.budget}</p>
            <p className="mt-2 text-xs text-muted">Budget</p>
          </div>
          <div className="px-5 py-5 text-center">
            <p className="tnum font-display text-3xl leading-none text-amber">{budget.committed}</p>
            <p className="mt-2 text-xs text-muted">Committed</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-dashed border-line bg-surface px-5 py-6">
      <h2 className="text-sm font-medium text-ink">Budget</h2>
      <p className="mt-1 text-sm text-muted">
        Budget figures aren&rsquo;t summarised on the dashboard yet. They&rsquo;ll appear here once the
        Budget module is wired in.
      </p>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <div className="h-9 w-20 rounded-md bg-line/50" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-lg border border-line bg-surface">
            <div className="border-b border-line px-5 py-3">
              <div className="h-4 w-28 rounded bg-line/60" />
            </div>
            <div className="grid grid-cols-3 divide-x divide-line">
              {[0, 1, 2].map((j) => (
                <div key={j} className="px-5 py-6 text-center">
                  <div className="mx-auto h-7 w-8 rounded bg-line/60" />
                  <div className="mx-auto mt-3 h-3 w-12 rounded bg-line/40" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="h-20 rounded-lg border border-dashed border-line bg-surface" />
    </div>
  );
}
