"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { Badge } from "@/components/ui/Badge";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { parseScaled } from "@/lib/documents";
import { ANALYTIC_TYPE_LABEL, ANALYTIC_TYPE_TONE, type AnalyticAccount } from "@/lib/analyticAccounts";
import type { BudgetDetail } from "@/lib/budgets";

interface LineRow {
  key: string;
  analyticAccountId: string;
  committedAmount: string;
}
const newRow = (): LineRow => ({ key: Math.random().toString(36).slice(2), analyticAccountId: "", committedAmount: "" });
const today = () => new Date().toISOString().slice(0, 10);

export function BudgetForm({ budget }: { budget?: BudgetDetail }) {
  const router = useRouter();
  const editing = !!budget;
  const [analytics, setAnalytics] = useState<AnalyticAccount[] | null>(null);
  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [loadError, setLoadError] = useState(false);

  const [name, setName] = useState(budget?.name ?? "");
  const [periodStart, setPeriodStart] = useState(budget?.periodStart?.slice(0, 10) ?? today());
  const [periodEnd, setPeriodEnd] = useState(budget?.periodEnd?.slice(0, 10) ?? today());
  const [lines, setLines] = useState<LineRow[]>(() =>
    budget ? budget.lines.map((l) => ({ key: l.id, analyticAccountId: l.analyticAccountId, committedAmount: l.committedAmount })) : [newRow()],
  );

  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function loadRefs() {
    setLoadError(false);
    try {
      const [a, meRes] = await Promise.all([
        apiFetch<{ analyticAccounts: AnalyticAccount[] }>("/api/analytic-accounts"),
        apiFetch<{ user: { id: string; name: string } }>("/api/auth/me"),
      ]);
      setAnalytics(a.analyticAccounts);
      setMe(meRes.user);
    } catch {
      setLoadError(true);
    }
  }
  useEffect(() => {
    loadRefs();
  }, []);

  const analyticById = new Map((analytics ?? []).map((a) => [a.id, a]));
  const setLine = (key: string, patch: Partial<LineRow>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const addLine = () => setLines((ls) => [...ls, newRow()]);
  const removeLine = (key: string) => setLines((ls) => (ls.length <= 1 ? ls : ls.filter((l) => l.key !== key)));

  const lineValid = (l: LineRow) => {
    if (!l.analyticAccountId) return false;
    const c = parseScaled(l.committedAmount, 2);
    return c !== null;
  };
  const dupAnalytic = new Set(lines.map((l) => l.analyticAccountId).filter(Boolean)).size !== lines.filter((l) => l.analyticAccountId).length;
  const canSave = !!name.trim() && !!periodStart && !!periodEnd && periodEnd >= periodStart && lines.every(lineValid) && !dupAnalytic;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setFormError(null);
    if (!canSave) {
      if (dupAnalytic) setFormError("Each analytic account can appear only once.");
      else if (periodEnd < periodStart) setFormError("End date must be on or after the start date.");
      return;
    }
    setSaving(true);
    try {
      const linePayload = lines.map((l) => ({ analyticAccountId: l.analyticAccountId, committedAmount: Number(l.committedAmount || 0) }));
      if (editing) {
        await apiFetch(`/api/budgets/${budget!.id}`, {
          method: "PATCH",
          body: JSON.stringify({ name: name.trim(), periodStart, periodEnd, lines: linePayload }),
        });
        router.push(`/budgets/${budget!.id}`);
      } else {
        const res = await apiFetch<{ budget: { id: string } }>("/api/budgets", {
          method: "POST",
          body: JSON.stringify({ name: name.trim(), periodStart, periodEnd, responsibleId: me?.id, lines: linePayload }),
        });
        router.push(`/budgets/${res.budget.id}`);
      }
    } catch (err) {
      setSaving(false);
      if (err instanceof ApiRequestError) {
        if (err.code === "VALIDATION") setFormError("Check the name, period, and each budget line.");
        else setFormError(err.message);
      } else {
        setFormError("Can't reach the server. Check your connection and try again.");
      }
    }
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-line bg-surface p-8 text-center">
        <p className="text-sm text-oxblood">Couldn&rsquo;t load analytic accounts.</p>
        <Button variant="ghost" onClick={loadRefs} className="mt-4 h-9 px-3 text-sm">
          Try again
        </Button>
      </div>
    );
  }
  if (!analytics) return <div className="h-64 rounded-lg border border-line bg-surface" />;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {formError && (
        <div role="alert" className="rounded-md border-l-2 border-oxblood bg-oxblood/5 px-3 py-2 text-sm text-oxblood">
          {formError}
        </div>
      )}
      {analytics.length === 0 && (
        <div className="rounded-md border-l-2 border-amber bg-amber/10 px-3 py-2 text-sm text-amber">
          Create analytic accounts first — budget lines are tracked per analytic account.
        </div>
      )}

      <div className="grid gap-4 rounded-lg border border-line bg-surface p-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormField label="Budget name" htmlFor="name" error={submitted && !name.trim() ? "Enter a budget name." : undefined}>
            <Input id="name" autoFocus value={name} onChange={(e) => setName(e.target.value)} invalid={submitted && !name.trim()} />
          </FormField>
        </div>
        <FormField label="Period start" htmlFor="ps">
          <Input id="ps" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
        </FormField>
        <FormField label="Period end" htmlFor="pe" error={submitted && periodEnd < periodStart ? "On or after the start date." : undefined}>
          <Input id="pe" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} invalid={submitted && periodEnd < periodStart} />
        </FormField>
        {!editing && me && (
          <div className="sm:col-span-2">
            <p className="text-xs font-medium text-muted">Responsible</p>
            <p className="mt-0.5 text-sm text-ink">{me.name} <span className="text-muted">(you)</span></p>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium text-muted">
                <th className="px-3 py-2.5 font-medium">Analytic account</th>
                <th className="px-3 py-2.5 font-medium">Type</th>
                <th className="px-3 py-2.5 text-right font-medium">Committed (planned)</th>
                <th className="w-10 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const a = analyticById.get(l.analyticAccountId);
                const badAnalytic = submitted && !l.analyticAccountId;
                const badAmount = submitted && parseScaled(l.committedAmount, 2) === null;
                return (
                  <tr key={l.key} className="border-b border-line last:border-0 align-top">
                    <td className="px-3 py-2">
                      <Select value={l.analyticAccountId} onChange={(e) => setLine(l.key, { analyticAccountId: e.target.value })} invalid={badAnalytic}>
                        <option value="">Select analytic</option>
                        {analytics.map((an) => (
                          <option key={an.id} value={an.id}>
                            {an.name}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-3 py-3">
                      {a ? <Badge tone={ANALYTIC_TYPE_TONE[a.type]}>{ANALYTIC_TYPE_LABEL[a.type]}</Badge> : <span className="text-line">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        className="tnum w-36 text-right"
                        placeholder="0.00"
                        value={l.committedAmount}
                        onChange={(e) => setLine(l.key, { committedAmount: e.target.value })}
                        invalid={badAmount}
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeLine(l.key)}
                        disabled={lines.length <= 1}
                        aria-label="Remove line"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-line/60 hover:text-oxblood disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-3 py-3">
          <button type="button" onClick={addLine} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-pine transition-colors hover:bg-pine/5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Add line
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" loading={saving} disabled={submitted && !canSave}>
          {editing ? "Save changes" : "Create budget"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push(editing ? `/budgets/${budget!.id}` : "/budgets")}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
