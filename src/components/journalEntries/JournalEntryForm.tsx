"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { parseCents, centsToDecimal, type JournalEntryDetail } from "@/lib/journalEntries";
import type { Journal } from "@/lib/journals";
import type { Account } from "@/lib/accounts";
import type { Contact } from "@/lib/contacts";
import type { AnalyticAccount } from "@/lib/analyticAccounts";

interface Line {
  key: string;
  accountId: string;
  partnerId: string;
  analyticAccountId: string;
  debit: string;
  credit: string;
}

const newLine = (): Line => ({
  key: Math.random().toString(36).slice(2),
  accountId: "",
  partnerId: "",
  analyticAccountId: "",
  debit: "",
  credit: "",
});

const today = () => new Date().toISOString().slice(0, 10);

export function JournalEntryForm() {
  const router = useRouter();
  const [journals, setJournals] = useState<Journal[] | null>(null);
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticAccount[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const [journalId, setJournalId] = useState("");
  const [date, setDate] = useState(today());
  const [reference, setReference] = useState("");
  const [lines, setLines] = useState<Line[]>(() => [newLine(), newLine()]);

  const [submitted, setSubmitted] = useState(false);
  const [posting, setPosting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function loadRefs() {
    setLoadError(false);
    try {
      const [j, a, c, an] = await Promise.all([
        apiFetch<{ journals: Journal[] }>("/api/journals"),
        apiFetch<{ accounts: Account[] }>("/api/accounts"),
        apiFetch<{ contacts: Contact[] }>("/api/contacts"),
        apiFetch<{ analyticAccounts: AnalyticAccount[] }>("/api/analytic-accounts"),
      ]);
      setJournals(j.journals);
      setAccounts(a.accounts);
      setContacts(c.contacts);
      setAnalytics(an.analyticAccounts);
    } catch {
      setLoadError(true);
    }
  }

  useEffect(() => {
    loadRefs();
  }, []);

  const setLine = (key: string, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  // Typing a debit clears the credit on that line, and vice versa (a line has exactly one side).
  const onDebit = (key: string, v: string) => setLine(key, { debit: v, credit: v.trim() ? "" : lineOf(key).credit });
  const onCredit = (key: string, v: string) => setLine(key, { credit: v, debit: v.trim() ? "" : lineOf(key).debit });
  const lineOf = (key: string) => lines.find((l) => l.key === key)!;

  const addLine = () => setLines((ls) => [...ls, newLine()]);
  const removeLine = (key: string) => setLines((ls) => (ls.length <= 2 ? ls : ls.filter((l) => l.key !== key)));

  // Informational totals only (exact integer cents). The backend is authoritative.
  const totals = useMemo(() => {
    let debit = 0;
    let credit = 0;
    let parseOk = true;
    for (const l of lines) {
      const d = parseCents(l.debit);
      const c = parseCents(l.credit);
      if (d === null || c === null) parseOk = false;
      else {
        debit += d;
        credit += c;
      }
    }
    return { debit, credit, diff: debit - credit, parseOk };
  }, [lines]);

  const balanced = totals.parseOk && totals.diff === 0 && totals.debit > 0;

  function lineError(l: Line): string | null {
    if (!submitted) return null;
    if (!l.accountId) return "account";
    const d = parseCents(l.debit);
    const c = parseCents(l.credit);
    if (d === null || c === null) return "amount";
    if (d > 0 && c > 0) return "both";
    if (d === 0 && c === 0) return "empty";
    return null;
  }

  const anyLineError = lines.some((l) => {
    if (!l.accountId) return true;
    const d = parseCents(l.debit);
    const c = parseCents(l.credit);
    if (d === null || c === null) return true;
    return (d > 0) === (c > 0); // both or neither
  });

  const canPost = !!journalId && !!date && lines.length >= 2 && !anyLineError && balanced;

  async function post() {
    setPosting(true);
    setFormError(null);
    try {
      const payload = {
        journalId,
        date,
        ...(reference.trim() ? { reference: reference.trim() } : {}),
        lines: lines.map((l) => {
          const d = parseCents(l.debit) ?? 0;
          const base: Record<string, unknown> = { accountId: l.accountId };
          if (l.partnerId) base.partnerId = l.partnerId;
          if (l.analyticAccountId) base.analyticAccountId = l.analyticAccountId;
          if (d > 0) base.debit = Number(l.debit);
          else base.credit = Number(l.credit);
          return base;
        }),
      };
      const res = await apiFetch<{ entry: JournalEntryDetail }>("/api/journal-entries", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      router.push(`/journal-entries/${res.entry.id}`);
    } catch (err) {
      setConfirm(false);
      setPosting(false);
      if (err instanceof ApiRequestError) {
        if (err.code === "UNBALANCED" || err.code === "INVALID_LINE") {
          setFormError(err.message);
        } else if (err.code === "NOT_FOUND") {
          setFormError(err.message);
        } else if (err.code === "VALIDATION") {
          setFormError("Some fields are invalid. Check the journal, date, and each line.");
        } else if (err.code === "FORBIDDEN") {
          setFormError("You don't have permission to post journal entries.");
        } else {
          setFormError(err.message);
        }
      } else {
        setFormError("Can't reach the server. Check your connection and try again.");
      }
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setFormError(null);
    if (!canPost) return;
    setConfirm(true);
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-line bg-surface p-8 text-center">
        <p className="text-sm text-oxblood">Couldn&rsquo;t load journals and accounts.</p>
        <Button variant="ghost" onClick={loadRefs} className="mt-4 h-9 px-3 text-sm">
          Try again
        </Button>
      </div>
    );
  }

  const loading = !journals || !accounts || !contacts || !analytics;
  if (loading) return <FormSkeleton />;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {formError && (
        <div role="alert" className="rounded-md border-l-2 border-oxblood bg-oxblood/5 px-3 py-2 text-sm text-oxblood">
          {formError}
        </div>
      )}

      <div className="grid gap-4 rounded-lg border border-line bg-surface p-6 sm:grid-cols-3">
        <FormField label="Journal" htmlFor="journal" error={submitted && !journalId ? "Choose a journal." : undefined}>
          <Select id="journal" value={journalId} onChange={(e) => setJournalId(e.target.value)} invalid={submitted && !journalId}>
            <option value="">Select a journal</option>
            {journals!.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Accounting date" htmlFor="date" error={submitted && !date ? "Choose a date." : undefined}>
          <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} invalid={submitted && !date} />
        </FormField>
        <FormField label="Reference" htmlFor="reference" error={undefined} hint="Optional.">
          <Input id="reference" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. adjustment note" />
        </FormField>
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium text-muted">
                <th className="px-3 py-2.5 font-medium">Account</th>
                <th className="px-3 py-2.5 font-medium">Partner</th>
                <th className="px-3 py-2.5 font-medium">Analytic</th>
                <th className="px-3 py-2.5 text-right font-medium">Debit</th>
                <th className="px-3 py-2.5 text-right font-medium">Credit</th>
                <th className="w-10 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const err = lineError(l);
                return (
                  <tr key={l.key} className="border-b border-line last:border-0 align-top">
                    <td className="px-3 py-2">
                      <Select value={l.accountId} onChange={(e) => setLine(l.key, { accountId: e.target.value })} invalid={err === "account"}>
                        <option value="">Select account</option>
                        {accounts!.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code} · {a.name}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Select value={l.partnerId} onChange={(e) => setLine(l.key, { partnerId: e.target.value })}>
                        <option value="">—</option>
                        {contacts!.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Select value={l.analyticAccountId} onChange={(e) => setLine(l.key, { analyticAccountId: e.target.value })}>
                        <option value="">—</option>
                        {analytics!.map((an) => (
                          <option key={an.id} value={an.id}>
                            {an.name}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        className="tnum text-right"
                        placeholder="0.00"
                        value={l.debit}
                        onChange={(e) => onDebit(l.key, e.target.value)}
                        invalid={err === "amount" || err === "both" || err === "empty"}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        className="tnum text-right"
                        placeholder="0.00"
                        value={l.credit}
                        onChange={(e) => onCredit(l.key, e.target.value)}
                        invalid={err === "amount" || err === "both" || err === "empty"}
                      />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeLine(l.key)}
                        disabled={lines.length <= 2}
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
            <tfoot>
              <tr className="border-t-2 border-line bg-paper/40 font-medium">
                <td className="px-3 py-3 text-muted" colSpan={3}>
                  Totals
                </td>
                <td className="tnum px-3 py-3 text-right text-ink">{formatMoney(centsToDecimal(totals.debit))}</td>
                <td className="tnum px-3 py-3 text-right text-ink">{formatMoney(centsToDecimal(totals.credit))}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-3 py-3">
          <button
            type="button"
            onClick={addLine}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-pine transition-colors hover:bg-pine/5"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Add line
          </button>
          <BalanceIndicator diff={totals.diff} balanced={balanced} parseOk={totals.parseOk} />
        </div>
      </div>

      {confirm ? (
        <div className="rounded-lg border border-line bg-surface p-5">
          <p className="text-sm text-ink">
            Posting creates a permanent, balanced ledger entry that <strong>cannot be edited or deleted</strong>. Continue?
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Button type="button" onClick={post} loading={posting}>
              Confirm &amp; post
            </Button>
            <Button type="button" variant="ghost" onClick={() => setConfirm(false)} disabled={posting}>
              Back
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={submitted && !canPost}>
            Post entry
          </Button>
          <Button type="button" variant="ghost" onClick={() => router.push("/journal-entries")}>
            Cancel
          </Button>
          {submitted && !canPost && (
            <span className="text-sm text-oxblood">
              {!balanced ? "Debit and credit must balance." : "Complete every line (account + one amount)."}
            </span>
          )}
        </div>
      )}
    </form>
  );
}

function BalanceIndicator({ diff, balanced, parseOk }: { diff: number; balanced: boolean; parseOk: boolean }) {
  if (!parseOk) {
    return <span className="text-sm text-oxblood">Some amounts aren&rsquo;t valid numbers.</span>;
  }
  if (balanced) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-income">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Balanced
      </span>
    );
  }
  return (
    <span className="text-sm text-amber">
      Difference <span className="tnum font-medium">{formatMoney(centsToDecimal(Math.abs(diff)))}</span>{" "}
      {diff > 0 ? "(debit over)" : "(credit over)"}
    </span>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-lg border border-line bg-surface p-6 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-11 rounded-md bg-line/40" />
        ))}
      </div>
      <div className="rounded-lg border border-line bg-surface p-6">
        {[0, 1].map((i) => (
          <div key={i} className="mb-3 h-11 rounded-md bg-line/40" />
        ))}
      </div>
    </div>
  );
}
