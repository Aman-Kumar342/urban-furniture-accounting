"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/format";
import { formatEntryDate } from "@/lib/journalEntries";
import { DOC_STATE_LABEL, DOC_STATE_TONE, PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE, type InvoiceDetail } from "@/lib/invoices";

export function PortalInvoiceDetail({ id }: { id: string }) {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "notfound" | "ready">("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await apiFetch<{ invoice: InvoiceDetail }>(`/api/invoices/${id}`);
      setInvoice(res.invoice);
      setStatus("ready");
    } catch (e) {
      // A contact requesting another customer's invoice gets 404 from the server (ownership).
      setStatus(e instanceof ApiRequestError && e.code === "NOT_FOUND" ? "notfound" : "error");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (status === "loading") return <div className="h-64 rounded-lg border border-line bg-surface" />;
  if (status === "notfound") {
    return (
      <Panel>
        <p className="font-display text-lg text-ink">Invoice not found</p>
        <p className="mt-1 text-sm text-muted">It may not be available on your account.</p>
        <Link href="/portal" className="mt-5 inline-block">
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

  const isDraft = invoice.state === "DRAFT";

  return (
    <div className="space-y-5">
      <Link href="/portal" className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-pine">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Invoices
      </Link>

      <div className="flex flex-wrap items-center gap-2.5">
        <h1 className="tnum font-display text-xl text-ink">{invoice.number}</h1>
        <Badge tone={DOC_STATE_TONE[invoice.state]}>{DOC_STATE_LABEL[invoice.state]}</Badge>
        {!isDraft && <Badge tone={PAYMENT_STATUS_TONE[invoice.paymentStatus]}>{PAYMENT_STATUS_LABEL[invoice.paymentStatus]}</Badge>}
      </div>

      <dl className="grid gap-4 rounded-lg border border-line bg-surface p-6 sm:grid-cols-3">
        <Field label="Invoice date" value={formatEntryDate(invoice.invoiceDate)} />
        <Field label="Due date" value={invoice.dueDate ? formatEntryDate(invoice.dueDate) : "—"} />
        <Field label="Amount due" value={formatMoney(invoice.amountDue)} mono />
      </dl>

      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium text-muted">
                <th className="px-4 py-3 font-medium">Line</th>
                <th className="px-4 py-3 text-right font-medium">Qty</th>
                <th className="px-4 py-3 text-right font-medium">Unit price</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((l, i) => (
                <tr key={l.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 text-muted">Item {i + 1}</td>
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

      <p className="text-xs text-muted">Please contact us to arrange payment for any outstanding amount.</p>
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
