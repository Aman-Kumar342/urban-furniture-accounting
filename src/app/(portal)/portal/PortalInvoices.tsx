"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/format";
import { formatEntryDate, parseCents } from "@/lib/journalEntries";
import { centsToDecimal } from "@/lib/documents";
import { PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE, type InvoiceRow } from "@/lib/invoices";

type Display = "DRAFT" | "NOT_PAID" | "PARTIAL" | "PAID";
const displayOf = (inv: InvoiceRow): Display => (inv.state === "DRAFT" ? "DRAFT" : inv.paymentStatus);
const LABEL: Record<Display, string> = { DRAFT: "Draft", ...PAYMENT_STATUS_LABEL };
const TONE = { DRAFT: "neutral", ...PAYMENT_STATUS_TONE } as const;

export function PortalInvoices() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ invoices: InvoiceRow[] }>("/api/invoices");
      setInvoices(res.invoices);
    } catch {
      setError("Couldn't load your invoices. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const outstanding =
    invoices && invoices.some((i) => i.state === "CONFIRMED")
      ? centsToDecimal(
          invoices.filter((i) => i.state === "CONFIRMED").reduce((s, i) => s + (parseCents(i.amountDue) ?? 0), 0),
        )
      : "0";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl text-ink">Your invoices</h1>
        {invoices && invoices.length > 0 && (
          <p className="mt-1 text-sm text-muted">
            {invoices.length} {invoices.length === 1 ? "invoice" : "invoices"} · outstanding{" "}
            <span className="tnum font-medium text-ink">{formatMoney(outstanding)}</span>
          </p>
        )}
      </div>

      {loading ? (
        <div className="h-40 rounded-lg border border-line bg-surface" />
      ) : error ? (
        <div className="rounded-lg border border-line bg-surface p-8 text-center">
          <p className="text-sm text-oxblood">{error}</p>
          <Button variant="ghost" onClick={load} className="mt-4 h-9 px-3 text-sm">
            Try again
          </Button>
        </div>
      ) : !invoices || invoices.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-14 text-center">
          <p className="font-display text-lg text-ink">No invoices yet</p>
          <p className="mt-1 text-sm text-muted">Your invoices will appear here once they&rsquo;re issued.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium text-muted">
                  <th className="px-4 py-3 font-medium">Invoice</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Due</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 text-right font-medium">Amount due</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => {
                  const d = displayOf(inv);
                  return (
                    <tr key={inv.id} onClick={() => router.push(`/portal/invoices/${inv.id}`)} className="cursor-pointer border-b border-line last:border-0 transition-colors hover:bg-paper/60">
                      <td className="px-4 py-3">
                        <Link href={`/portal/invoices/${inv.id}`} onClick={(e) => e.stopPropagation()} className="tnum font-medium text-ink hover:text-pine hover:underline">
                          {inv.number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted">{formatEntryDate(inv.invoiceDate)}</td>
                      <td className="px-4 py-3 text-muted">{inv.dueDate ? formatEntryDate(inv.dueDate) : "—"}</td>
                      <td className="tnum px-4 py-3 text-right text-ink">{formatMoney(inv.amountTotal)}</td>
                      <td className="tnum px-4 py-3 text-right text-ink">{formatMoney(inv.amountDue)}</td>
                      <td className="px-4 py-3">
                        <Badge tone={TONE[d]}>{LABEL[d]}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
