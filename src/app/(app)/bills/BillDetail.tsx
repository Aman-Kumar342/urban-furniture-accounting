"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { PaymentForm } from "@/components/payments/PaymentForm";
import { formatMoney } from "@/lib/format";
import { formatEntryDate, parseCents } from "@/lib/journalEntries";
import { DOC_STATE_LABEL, DOC_STATE_TONE, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE } from "@/lib/invoices";
import { paidByMethod, type BillDetail as Bill } from "@/lib/bills";
import type { Contact } from "@/lib/contacts";
import type { Product } from "@/lib/products";
import type { Account } from "@/lib/accounts";
import type { AnalyticAccount } from "@/lib/analyticAccounts";

export function BillDetail({ id }: { id: string }) {
  const [bill, setBill] = useState<Bill | null>(null);
  const [names, setNames] = useState<{
    contact: Map<string, string>;
    product: Map<string, string>;
    account: Map<string, string>;
    analytic: Map<string, string>;
  }>({ contact: new Map(), product: new Map(), account: new Map(), analytic: new Map() });
  const [status, setStatus] = useState<"loading" | "error" | "notfound" | "ready">("loading");
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const [bl, c, p, a, an] = await Promise.all([
        apiFetch<{ bill: Bill }>(`/api/bills/${id}`),
        apiFetch<{ contacts: Contact[] }>("/api/contacts").catch(() => ({ contacts: [] })),
        apiFetch<{ products: Product[] }>("/api/products").catch(() => ({ products: [] })),
        apiFetch<{ accounts: Account[] }>("/api/accounts?includeArchived=true").catch(() => ({ accounts: [] })),
        apiFetch<{ analyticAccounts: AnalyticAccount[] }>("/api/analytic-accounts").catch(() => ({ analyticAccounts: [] })),
      ]);
      setBill(bl.bill);
      setNames({
        contact: new Map(c.contacts.map((x) => [x.id, x.name])),
        product: new Map(p.products.map((x) => [x.id, x.name])),
        account: new Map(a.accounts.map((x) => [x.id, `${x.code} · ${x.name}`])),
        analytic: new Map(an.analyticAccounts.map((x) => [x.id, x.name])),
      });
      setStatus("ready");
    } catch (e) {
      setStatus(e instanceof ApiRequestError && e.code === "NOT_FOUND" ? "notfound" : "error");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmBill() {
    setConfirming(true);
    setActionError(null);
    try {
      const res = await apiFetch<{ warnings: string[] }>(`/api/bills/${id}/confirm`, { method: "POST", body: "{}" });
      setWarnings(res.warnings ?? []);
      setPendingConfirm(false);
      await load();
    } catch (e) {
      setActionError(e instanceof ApiRequestError ? e.message : "Couldn't confirm the bill.");
    } finally {
      setConfirming(false);
    }
  }

  if (status === "loading") return <DetailSkeleton />;
  if (status === "notfound") {
    return (
      <Panel>
        <p className="font-display text-lg text-ink">Bill not found</p>
        <Link href="/bills" className="mt-5 inline-block">
          <Button variant="ghost">Back to bills</Button>
        </Link>
      </Panel>
    );
  }
  if (status === "error" || !bill) {
    return (
      <Panel>
        <p className="text-sm text-oxblood">Couldn&rsquo;t load this bill.</p>
        <Button variant="ghost" onClick={load} className="mt-4 h-9 px-3 text-sm">
          Try again
        </Button>
      </Panel>
    );
  }

  const dueCents = parseCents(bill.amountDue) ?? 0;
  const vendorName = names.contact.get(bill.vendorId) ?? "—";
  const isDraft = bill.state === "DRAFT";
  const canPay = bill.state === "CONFIRMED" && dueCents > 0;
  const paid = paidByMethod(bill.allocations);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="tnum font-display text-xl text-ink">{bill.number}</h2>
          <Badge tone={DOC_STATE_TONE[bill.state]}>{DOC_STATE_LABEL[bill.state]}</Badge>
          {!isDraft && <Badge tone={PAYMENT_STATUS_TONE[bill.paymentStatus]}>{PAYMENT_STATUS_LABEL[bill.paymentStatus]}</Badge>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {bill.purchaseOrderId && (
            <Link href={`/purchase-orders/${bill.purchaseOrderId}`}>
              <Button variant="ghost" title="Open the purchase order this bill was created from">PO</Button>
            </Link>
          )}
          <Link href="/reports/budget">
            <Button variant="ghost" title="Open the budget report">Budget</Button>
          </Link>
          {isDraft &&
            (pendingConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted">Confirm &amp; post this bill?</span>
                <Button onClick={confirmBill} loading={confirming}>
                  Confirm bill
                </Button>
                <Button variant="ghost" onClick={() => setPendingConfirm(false)} disabled={confirming}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button onClick={() => setPendingConfirm(true)}>Confirm bill</Button>
            ))}
          {canPay && !payOpen && <Button onClick={() => setPayOpen(true)}>Send payment</Button>}
        </div>
      </div>

      {isDraft ? (
        <p className="text-sm text-muted">
          Confirming posts a balanced journal entry (Dr Purchase Expense / Cr Creditors) and locks the bill.
        </p>
      ) : (
        <p className="text-xs text-muted">
          Status is derived: <strong className="font-medium">Paid</strong> when amount due is 0,{" "}
          <strong className="font-medium">Partial</strong> when it&rsquo;s below the bill total,{" "}
          <strong className="font-medium">Not paid</strong> when it equals the total.
        </p>
      )}
      {warnings.length > 0 && (
        <div className="rounded-md border-l-2 border-amber bg-amber/10 px-3 py-2 text-sm text-amber">
          {warnings.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
        </div>
      )}
      {actionError && (
        <div role="alert" className="rounded-md border-l-2 border-oxblood bg-oxblood/5 px-3 py-2 text-sm text-oxblood">
          {actionError}
        </div>
      )}

      {payOpen && canPay && (
        <PaymentForm
          kind="bill"
          targetId={bill.id}
          partnerName={vendorName}
          amountDue={bill.amountDue}
          onCancel={() => setPayOpen(false)}
          onDone={() => {
            setPayOpen(false);
            load();
          }}
        />
      )}

      <dl className="grid gap-4 rounded-lg border border-line bg-surface p-6 sm:grid-cols-4">
        <Field label="Vendor" value={vendorName} />
        <ReferenceEditor bill={bill} onSaved={(ref) => setBill((b) => (b ? { ...b, reference: ref } : b))} />
        <Field label="Bill date" value={formatEntryDate(bill.billDate)} />
        <Field label="Due date" value={bill.dueDate ? formatEntryDate(bill.dueDate) : "—"} />
        <Field label="Amount due" value={formatMoney(bill.amountDue)} mono />
      </dl>

      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium text-muted">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Chart of accounts</th>
                <th className="px-4 py-3 font-medium">Budget analytics</th>
                <th className="px-4 py-3 text-right font-medium">Qty</th>
                <th className="px-4 py-3 text-right font-medium">Unit price</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {bill.lines.map((l) => (
                <tr key={l.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 text-ink">{names.product.get(l.productId) || <span className="text-line">—</span>}</td>
                  <td className="px-4 py-3 text-muted">{names.account.get(l.accountId) || <span className="text-line">—</span>}</td>
                  <td className="px-4 py-3 text-muted">
                    {l.analyticAccountId ? names.analytic.get(l.analyticAccountId) ?? "—" : <span className="text-line">—</span>}
                  </td>
                  <td className="tnum px-4 py-3 text-right text-muted">{Number(l.quantity)}</td>
                  <td className="tnum px-4 py-3 text-right text-muted">{formatMoney(l.unitPrice)}</td>
                  <td className="tnum px-4 py-3 text-right text-ink">{formatMoney(l.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end border-t border-line bg-paper/40 px-4 py-4">
          <dl className="w-full max-w-xs space-y-1.5 text-sm">
            <Row label="Total" value={formatMoney(bill.amountTotal)} />
            {paid.cash > 0 && <Row label="Paid via Cash" value={formatMoney(paid.cash.toFixed(2))} />}
            {paid.bank > 0 && <Row label="Paid via Bank" value={formatMoney(paid.bank.toFixed(2))} />}
            {paid.cash === 0 && paid.bank === 0 && (parseCents(bill.amountPaid) ?? 0) > 0 && (
              <Row label="Amount paid" value={formatMoney(bill.amountPaid)} />
            )}
            <div className="border-t border-line pt-1.5">
              <Row label="Amount due" value={formatMoney(bill.amountDue)} strong />
            </div>
          </dl>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
        {bill.purchaseOrderId && (
          <span>
            From purchase order{" "}
            <Link href={`/purchase-orders/${bill.purchaseOrderId}`} className="text-pine hover:underline">
              view
            </Link>
          </span>
        )}
        {bill.journalEntry && (
          <span>
            Journal entry{" "}
            <Link href={`/journal-entries/${bill.journalEntry.id}`} className="tnum text-pine hover:underline">
              {bill.journalEntry.number}
            </Link>
          </span>
        )}
      </div>
    </div>
  );
}

function ReferenceEditor({ bill, onSaved }: { bill: Bill; onSaved: (ref: string | null) => void }) {
  const [val, setVal] = useState(bill.reference ?? "");
  const [saving, setSaving] = useState(false);
  const [savedRef, setSavedRef] = useState(false);
  const [err, setErr] = useState(false);

  if (bill.state !== "DRAFT") {
    return <Field label="Bill reference" value={bill.reference || "—"} />;
  }

  async function save() {
    setSaving(true);
    setErr(false);
    try {
      const res = await apiFetch<{ bill: { reference: string | null } }>(`/api/bills/${bill.id}`, {
        method: "PATCH",
        body: JSON.stringify({ reference: val.trim() || null }),
      });
      onSaved(res.bill.reference);
      setSavedRef(true);
      setTimeout(() => setSavedRef(false), 1500);
    } catch {
      setErr(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="sm:col-span-2">
      <dt className="text-xs font-medium text-muted">Bill reference</dt>
      <dd className="mt-1 flex items-center gap-2">
        <Input value={val} onChange={(e) => setVal(e.target.value)} placeholder="e.g. ABC-26-001" className="h-9" invalid={err} />
        <Button type="button" variant="ghost" onClick={save} loading={saving} className="h-9 shrink-0 px-3 text-sm">
          {savedRef ? "Saved" : "Save"}
        </Button>
      </dd>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-6">
      <dt className={strong ? "font-medium text-ink" : "text-muted"}>{label}</dt>
      <dd className={`tnum ${strong ? "font-semibold text-ink" : "text-ink"}`}>{value}</dd>
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
      <div className="h-7 w-44 rounded bg-line/50" />
      <div className="grid gap-4 rounded-lg border border-line bg-surface p-6 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-10 rounded bg-line/40" />
        ))}
      </div>
      <div className="h-40 rounded-lg border border-line bg-surface" />
    </div>
  );
}
