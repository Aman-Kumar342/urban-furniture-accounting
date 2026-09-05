"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { BudgetDonut } from "@/components/budgets/BudgetDonut";
import { formatMoney } from "@/lib/format";
import { formatEntryDate, parseCents } from "@/lib/journalEntries";
import { centsToDecimal } from "@/lib/documents";
import { ANALYTIC_TYPE_LABEL, ANALYTIC_TYPE_TONE } from "@/lib/analyticAccounts";
import { BUDGET_STATE_LABEL, BUDGET_STATE_TONE, type BudgetDetail as Budget, type BudgetReport } from "@/lib/budgets";

const diff = (a: string, b: string) => centsToDecimal((parseCents(a) ?? 0) - (parseCents(b) ?? 0));

export function BudgetDetail({ id }: { id: string }) {
  const router = useRouter();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [report, setReport] = useState<BudgetReport | null>(null);
  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "notfound" | "ready">("loading");
  const [pending, setPending] = useState<"confirm" | "revise" | "cancel" | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const [b, r, meRes] = await Promise.all([
        apiFetch<{ budget: Budget }>(`/api/budgets/${id}`),
        apiFetch<BudgetReport>(`/api/budgets/${id}/report`),
        apiFetch<{ user: { id: string; name: string } }>("/api/auth/me").catch(() => ({ user: null })),
      ]);
      setBudget(b.budget);
      setReport(r);
      setMe(meRes.user);
      setStatus("ready");
    } catch (e) {
      setStatus(e instanceof ApiRequestError && e.code === "NOT_FOUND" ? "notfound" : "error");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function runAction(path: "confirm" | "revise" | "cancel") {
    setBusy(true);
    setActionError(null);
    try {
      const res = await apiFetch<{ budget: { id: string } }>(`/api/budgets/${id}/${path}`, { method: "POST", body: "{}" });
      setPending(null);
      if (path === "revise") router.push(`/budgets/${res.budget.id}`);
      else await load();
    } catch (e) {
      setActionError(e instanceof ApiRequestError ? e.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (status === "loading") return <DetailSkeleton />;
  if (status === "notfound") {
    return (
      <Panel>
        <p className="font-display text-lg text-ink">Budget not found</p>
        <Link href="/budgets" className="mt-5 inline-block">
          <Button variant="ghost">Back to budgets</Button>
        </Link>
      </Panel>
    );
  }
  if (status === "error" || !budget || !report) {
    return (
      <Panel>
        <p className="text-sm text-oxblood">Couldn&rsquo;t load this budget.</p>
        <Button variant="ghost" onClick={load} className="mt-4 h-9 px-3 text-sm">
          Try again
        </Button>
      </Panel>
    );
  }

  const responsible = me && budget.responsibleId === me.id ? `${me.name} (you)` : "—";
  const amountToAchieve = diff(report.totalCommitted, report.totalAchieved);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="font-display text-xl text-ink">{budget.name}</h2>
          <Badge tone={BUDGET_STATE_TONE[budget.state]}>{BUDGET_STATE_LABEL[budget.state]}</Badge>
        </div>
        <Actions state={budget.state} pending={pending} setPending={setPending} busy={busy} run={runAction} editHref={`/budgets/${id}/edit`} />
      </div>

      {actionError && (
        <div role="alert" className="rounded-md border-l-2 border-oxblood bg-oxblood/5 px-3 py-2 text-sm text-oxblood">
          {actionError}
        </div>
      )}

      <dl className="grid gap-4 rounded-lg border border-line bg-surface p-6 sm:grid-cols-3">
        <Field label="Period" value={`${formatEntryDate(budget.periodStart)} – ${formatEntryDate(budget.periodEnd)}`} />
        <Field label="Responsible" value={responsible} />
        <Field label="Status" value={BUDGET_STATE_LABEL[budget.state]} />
      </dl>

      <div className="flex flex-wrap items-center gap-6 rounded-lg border border-line bg-surface p-6">
        <BudgetDonut committed={report.totalCommitted} achieved={report.totalAchieved} />
        <dl className="grid flex-1 grid-cols-3 gap-4">
          <Metric label="Committed" value={formatMoney(report.totalCommitted)} />
          <Metric label="Achieved" value={formatMoney(report.totalAchieved)} tone="income" />
          <Metric label="Amount to achieve" value={formatMoney(amountToAchieve)} />
        </dl>
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium text-muted">
                <th className="px-4 py-3 font-medium">Analytic account</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 text-right font-medium">Committed</th>
                <th className="px-4 py-3 text-right font-medium">Achieved</th>
                <th className="px-4 py-3 text-right font-medium">To achieve</th>
                <th className="px-4 py-3 text-right font-medium">Achieved %</th>
              </tr>
            </thead>
            <tbody>
              {report.lines.map((l) => (
                <tr key={l.analyticAccountId} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 text-ink">{l.analyticName}</td>
                  <td className="px-4 py-3">
                    <Badge tone={ANALYTIC_TYPE_TONE[l.type]}>{ANALYTIC_TYPE_LABEL[l.type]}</Badge>
                  </td>
                  <td className="tnum px-4 py-3 text-right text-ink">{formatMoney(l.committed)}</td>
                  <td className="tnum px-4 py-3 text-right text-income">{formatMoney(l.achieved)}</td>
                  <td className="tnum px-4 py-3 text-right text-muted">{formatMoney(l.amountToAchieve)}</td>
                  <td className="tnum px-4 py-3 text-right text-ink">{Number(l.achievedPct)}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-line bg-paper/40 font-medium">
                <td className="px-4 py-3 text-muted" colSpan={2}>
                  Total
                </td>
                <td className="tnum px-4 py-3 text-right text-ink">{formatMoney(report.totalCommitted)}</td>
                <td className="tnum px-4 py-3 text-right text-income">{formatMoney(report.totalAchieved)}</td>
                <td className="tnum px-4 py-3 text-right text-muted">{formatMoney(amountToAchieve)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {(budget.revisionOf || budget.revisions.length > 0) && (
        <div className="rounded-lg border border-line bg-surface p-5 text-sm">
          <p className="mb-2 font-medium text-ink">Revisions</p>
          {budget.revisionOf && (
            <p className="text-muted">
              Revision of{" "}
              <Link href={`/budgets/${budget.revisionOf.id}`} className="text-pine hover:underline">
                {budget.revisionOf.name}
              </Link>
            </p>
          )}
          {budget.revisions.map((r) => (
            <p key={r.id} className="text-muted">
              Superseded by{" "}
              <Link href={`/budgets/${r.id}`} className="text-pine hover:underline">
                {r.name}
              </Link>{" "}
              ({BUDGET_STATE_LABEL[r.state].toLowerCase()})
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function Actions({
  state,
  pending,
  setPending,
  busy,
  run,
  editHref,
}: {
  state: Budget["state"];
  pending: "confirm" | "revise" | "cancel" | null;
  setPending: (p: "confirm" | "revise" | "cancel" | null) => void;
  busy: boolean;
  run: (p: "confirm" | "revise" | "cancel") => void;
  editHref: string;
}) {
  if (pending) {
    const label =
      pending === "confirm" ? "Confirm this budget?" : pending === "revise" ? "Create a new draft revision?" : "Cancel this budget?";
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted">{label}</span>
        <Button onClick={() => run(pending)} loading={busy}>
          {pending === "confirm" ? "Confirm" : pending === "revise" ? "Revise" : "Cancel budget"}
        </Button>
        <Button variant="ghost" onClick={() => setPending(null)} disabled={busy}>
          Back
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {state === "DRAFT" && (
        <>
          <Button onClick={() => setPending("confirm")}>Confirm</Button>
          <Link href={editHref}>
            <Button variant="ghost">Edit</Button>
          </Link>
          <Button variant="ghost" onClick={() => setPending("cancel")}>
            Cancel
          </Button>
        </>
      )}
      {state === "CONFIRMED" && (
        <>
          <Button onClick={() => setPending("revise")}>Revise</Button>
          <Button variant="ghost" onClick={() => setPending("cancel")}>
            Cancel
          </Button>
        </>
      )}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "income" }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className={`tnum mt-0.5 text-lg font-semibold ${tone === "income" ? "text-income" : "text-ink"}`}>{value}</dd>
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
      <div className="h-7 w-48 rounded bg-line/50" />
      <div className="grid gap-4 rounded-lg border border-line bg-surface p-6 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 rounded bg-line/40" />
        ))}
      </div>
      <div className="h-24 rounded-lg border border-line bg-surface" />
      <div className="h-40 rounded-lg border border-line bg-surface" />
    </div>
  );
}
