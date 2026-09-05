"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/format";
import { formatEntryDate } from "@/lib/journalEntries";
import { DIRECTION_LABEL, DIRECTION_TONE, type PaymentDetail as Payment } from "@/lib/payments";
import type { Account } from "@/lib/accounts";

export function PaymentDetail({ id }: { id: string }) {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [accountName, setAccountName] = useState<Map<string, string>>(new Map());
  const [status, setStatus] = useState<"loading" | "error" | "notfound" | "ready">("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const [p, a] = await Promise.all([
        apiFetch<{ payment: Payment }>(`/api/payments/${id}`),
        apiFetch<{ accounts: Account[] }>("/api/accounts?includeArchived=true").catch(() => ({ accounts: [] })),
      ]);
      setPayment(p.payment);
      setAccountName(new Map(a.accounts.map((x) => [x.id, `${x.code} · ${x.name}`])));
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
        <p className="font-display text-lg text-ink">Payment not found</p>
        <Link href="/payments" className="mt-5 inline-block">
          <Button variant="ghost">Back to payments</Button>
        </Link>
      </Panel>
    );
  }
  if (status === "error" || !payment) {
    return (
      <Panel>
        <p className="text-sm text-oxblood">Couldn&rsquo;t load this payment.</p>
        <Button variant="ghost" onClick={load} className="mt-4 h-9 px-3 text-sm">
          Try again
        </Button>
      </Panel>
    );
  }

  const receive = payment.direction === "RECEIVE";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <h2 className="tnum font-display text-xl text-ink">{payment.number}</h2>
        <Badge tone={DIRECTION_TONE[payment.direction]}>{DIRECTION_LABEL[payment.direction]}</Badge>
      </div>

      <dl className="grid gap-4 rounded-lg border border-line bg-surface p-6 sm:grid-cols-4">
        <Field label="Date" value={formatEntryDate(payment.paymentDate)} />
        <Field label="Partner" value={payment.partner?.name ?? "—"} />
        <Field label="Method" value={payment.journal?.name ?? "—"} />
        <Field label="Amount" value={formatMoney(payment.amount)} mono />
      </dl>

      <section className="overflow-hidden rounded-lg border border-line bg-surface">
        <header className="border-b border-line px-4 py-3">
          <h3 className="text-sm font-medium text-ink">Allocation</h3>
        </header>
        {payment.allocations.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted">Not allocated to a document.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium text-muted">
                <th className="px-4 py-2.5 font-medium">{receive ? "Invoice" : "Bill"}</th>
                <th className="px-4 py-2.5 text-right font-medium">Allocated</th>
              </tr>
            </thead>
            <tbody>
              {payment.allocations.map((a) => {
                const doc = a.invoice ?? a.bill;
                const href = a.invoiceId ? `/invoices/${a.invoiceId}` : a.billId ? `/bills/${a.billId}` : null;
                return (
                  <tr key={a.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5">
                      {doc && href ? (
                        <Link href={href} className="tnum text-pine hover:underline">
                          {doc.number}
                        </Link>
                      ) : (
                        <span className="text-line">—</span>
                      )}
                    </td>
                    <td className="tnum px-4 py-2.5 text-right text-ink">{formatMoney(a.amount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {payment.journalEntry && (
        <section className="overflow-hidden rounded-lg border border-line bg-surface">
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <h3 className="text-sm font-medium text-ink">Accounting entry</h3>
            <Link href={`/journal-entries/${payment.journalEntry.id}`} className="tnum text-sm text-pine hover:underline">
              {payment.journalEntry.number}
            </Link>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium text-muted">
                  <th className="px-4 py-2.5 font-medium">Account</th>
                  <th className="px-4 py-2.5 text-right font-medium">Debit</th>
                  <th className="px-4 py-2.5 text-right font-medium">Credit</th>
                </tr>
              </thead>
              <tbody>
                {payment.journalEntry.items.map((it) => (
                  <tr key={it.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5 text-ink">{accountName.get(it.accountId) ?? it.accountId}</td>
                    <td className="tnum px-4 py-2.5 text-right text-ink">
                      {Number(it.debit) > 0 ? formatMoney(it.debit) : <span className="text-line">—</span>}
                    </td>
                    <td className="tnum px-4 py-2.5 text-right text-ink">
                      {Number(it.credit) > 0 ? formatMoney(it.credit) : <span className="text-line">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {payment.note && <p className="text-sm text-muted">Note: {payment.note}</p>}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className={`mt-0.5 text-sm text-ink ${mono ? "tnum" : ""}`}>{value}</dd>
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
      <div className="grid gap-4 rounded-lg border border-line bg-surface p-6 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-10 rounded bg-line/40" />
        ))}
      </div>
      <div className="h-24 rounded-lg border border-line bg-surface" />
    </div>
  );
}
