"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PaymentForm } from "@/components/payments/PaymentForm";
import { formatMoney } from "@/lib/format";
import { formatEntryDate, parseCents } from "@/lib/journalEntries";
import {
  DOC_STATE_LABEL,
  DOC_STATE_TONE,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_TONE,
  type InvoiceDetail as Invoice,
} from "@/lib/invoices";
import type { Contact } from "@/lib/contacts";
import type { Product } from "@/lib/products";
import type { Account } from "@/lib/accounts";
import type { AnalyticAccount } from "@/lib/analyticAccounts";

export function InvoiceDetail({ id }: { id: string }) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
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

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const [inv, c, p, a, an] = await Promise.all([
        apiFetch<{ invoice: Invoice }>(`/api/invoices/${id}`),
        apiFetch<{ contacts: Contact[] }>("/api/contacts").catch(() => ({ contacts: [] })),
        apiFetch<{ products: Product[] }>("/api/products").catch(() => ({ products: [] })),
        apiFetch<{ accounts: Account[] }>("/api/accounts?includeArchived=true").catch(() => ({ accounts: [] })),
        apiFetch<{ analyticAccounts: AnalyticAccount[] }>("/api/analytic-accounts").catch(() => ({ analyticAccounts: [] })),
      ]);
      setInvoice(inv.invoice);
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

  async function confirmInvoice() {
    setConfirming(true);
    setActionError(null);
    try {
      await apiFetch(`/api/invoices/${id}/confirm`, { method: "POST", body: "{}" });
      setPendingConfirm(false);
      await load();
    } catch (e) {
      setActionError(e instanceof ApiRequestError ? e.message : "Couldn't confirm the invoice.");
    } finally {
      setConfirming(false);
    }
  }

  if (status === "loading") return <DetailSkeleton />;
  if (status === "notfound") {
    return (
      <Panel>
        <p className="font-display text-lg text-ink">Invoice not found</p>
        <Link href="/invoices" className="mt-5 inline-block">
          <Button variant="ghost">Back to invoices</Button>
        </Link>
      </Panel>
    );
  }
  if (status === "error" || !invoice) {
    return (
      <Panel>
        <p className="text-sm text-oxblood">Couldn&rsquo;t load this invoice.</p>
        <Button variant="ghost" onClick={load} className="mt-4 h-9 px-3 text-sm">
          Try again
        </Button>
      </Panel>
    );
  }

  const dueCents = parseCents(invoice.amountDue) ?? 0;
  const customerName = names.contact.get(invoice.customerId) ?? "—";
  const isDraft = invoice.state === "DRAFT";
  const canPay = invoice.state === "CONFIRMED" && dueCents > 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="tnum font-display text-xl text-ink">{invoice.number}</h2>
          <Badge tone={DOC_STATE_TONE[invoice.state]}>{DOC_STATE_LABEL[invoice.state]}</Badge>
          {!isDraft && <Badge tone={PAYMENT_STATUS_TONE[invoice.paymentStatus]}>{PAYMENT_STATUS_LABEL[invoice.paymentStatus]}</Badge>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isDraft &&
            (pendingConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted">Confirm &amp; post this invoice?</span>
                <Button onClick={confirmInvoice} loading={confirming}>
                  Confirm invoice
                </Button>
                <Button variant="ghost" onClick={() => setPendingConfirm(false)} disabled={confirming}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button onClick={() => setPendingConfirm(true)}>Confirm invoice</Button>
            ))}
          {canPay && !payOpen && <Button onClick={() => setPayOpen(true)}>Receive payment</Button>}
        </div>
      </div>

      {isDraft && (
        <p className="text-sm text-muted">
          Confirming posts a balanced journal entry (Dr Debtors / Cr Sales Income) and locks the invoice.
        </p>
      )}
      {actionError && (
        <div role="alert" className="rounded-md border-l-2 border-oxblood bg-oxblood/5 px-3 py-2 text-sm text-oxblood">
          {actionError}
        </div>
      )}

      {payOpen && canPay && (
        <PaymentForm
          kind="invoice"
          targetId={invoice.id}
          partnerName={customerName}
          amountDue={invoice.amountDue}
          onCancel={() => setPayOpen(false)}
          onDone={() => {
            setPayOpen(false);
            load();
          }}
        />
      )}

      <dl className="grid gap-4 rounded-lg border border-line bg-surface p-6 sm:grid-cols-4">
        <Field label="Customer" value={customerName} />
        <Field label="Invoice date" value={formatEntryDate(invoice.invoiceDate)} />
        <Field label="Due date" value={invoice.dueDate ? formatEntryDate(invoice.dueDate) : "—"} />
        <Field label="Amount due" value={formatMoney(invoice.amountDue)} mono />
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
              {invoice.lines.map((l) => (
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
            <Row label="Total" value={formatMoney(invoice.amountTotal)} />
            <Row label="Amount paid" value={formatMoney(invoice.amountPaid)} />
            <div className="border-t border-line pt-1.5">
              <Row label="Amount due" value={formatMoney(invoice.amountDue)} strong />
            </div>
          </dl>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
        {invoice.salesOrderId && (
          <span>
            From sales order{" "}
            <Link href={`/sales-orders/${invoice.salesOrderId}`} className="text-pine hover:underline">
              view
            </Link>
          </span>
        )}
        {invoice.journalEntry && (
          <span>
            Journal entry{" "}
            <Link href={`/journal-entries/${invoice.journalEntry.id}`} className="tnum text-pine hover:underline">
              {invoice.journalEntry.number}
            </Link>
          </span>
        )}
      </div>
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
