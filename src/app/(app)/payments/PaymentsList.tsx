"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/format";
import { formatEntryDate } from "@/lib/journalEntries";
import { DIRECTION_LABEL, DIRECTION_TONE, type PaymentDirection, type PaymentRow } from "@/lib/payments";
import type { InvoiceRow } from "@/lib/invoices";
import type { BillRow } from "@/lib/bills";

// The document a payment settles (its single allocation), resolved to a linkable number.
function settles(p: PaymentRow, invNo: Map<string, string>, billNo: Map<string, string>) {
  const a = p.allocations[0];
  if (!a) return null;
  if (a.invoiceId) return { href: `/invoices/${a.invoiceId}`, label: invNo.get(a.invoiceId) ?? "Invoice" };
  if (a.billId) return { href: `/bills/${a.billId}`, label: billNo.get(a.billId) ?? "Bill" };
  return null;
}

export function PaymentsList() {
  const router = useRouter();
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);
  const [invNo, setInvNo] = useState<Map<string, string>>(new Map());
  const [billNo, setBillNo] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [dir, setDir] = useState<"ALL" | PaymentDirection>("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, inv, bill] = await Promise.all([
        apiFetch<{ payments: PaymentRow[] }>("/api/payments"),
        apiFetch<{ invoices: InvoiceRow[] }>("/api/invoices").catch(() => ({ invoices: [] })),
        apiFetch<{ bills: BillRow[] }>("/api/bills").catch(() => ({ bills: [] })),
      ]);
      setPayments(p.payments);
      setInvNo(new Map(inv.invoices.map((x) => [x.id, x.number])));
      setBillNo(new Map(bill.bills.map((x) => [x.id, x.number])));
    } catch (e) {
      setError(
        e instanceof ApiRequestError && e.code === "FORBIDDEN"
          ? "You don't have access to payments."
          : "Couldn't load payments. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!payments) return [];
    const needle = q.trim().toLowerCase();
    return payments.filter((p) => {
      if (dir !== "ALL" && p.direction !== dir) return false;
      if (!needle) return true;
      return [p.number, p.partner?.name].filter(Boolean).some((v) => v!.toLowerCase().includes(needle));
    });
  }, [payments, q, dir]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full max-w-xs sm:w-56">
          <Input type="search" placeholder="Search number or partner…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search payments" />
        </div>
        <div className="w-40">
          <Select value={dir} onChange={(e) => setDir(e.target.value as "ALL" | PaymentDirection)} aria-label="Filter by direction">
            <option value="ALL">All directions</option>
            <option value="RECEIVE">Received</option>
            <option value="SEND">Sent</option>
          </Select>
        </div>
      </div>

      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <div className="rounded-lg border border-line bg-surface p-8 text-center">
          <p className="text-sm text-oxblood">{error}</p>
          <Button variant="ghost" onClick={load} className="mt-4 h-9 px-3 text-sm">
            Try again
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-14 text-center">
          {q.trim() || dir !== "ALL" ? (
            <p className="text-sm text-muted">No payments match your search.</p>
          ) : (
            <>
              <p className="font-display text-lg text-ink">No payments recorded yet</p>
              <p className="mt-1 text-sm text-muted">Receiving on an invoice or paying a bill records a payment here.</p>
            </>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium text-muted">
                  <th className="px-4 py-3 font-medium">Number</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Partner</th>
                  <th className="px-4 py-3 font-medium">Direction</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                  <th className="px-4 py-3 font-medium">Settles</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const s = settles(p, invNo, billNo);
                  return (
                    <tr key={p.id} onClick={() => router.push(`/payments/${p.id}`)} className="cursor-pointer border-b border-line last:border-0 transition-colors hover:bg-paper/60">
                      <td className="px-4 py-3">
                        <Link href={`/payments/${p.id}`} onClick={(e) => e.stopPropagation()} className="tnum font-medium text-ink hover:text-pine hover:underline">
                          {p.number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted">{formatEntryDate(p.paymentDate)}</td>
                      <td className="px-4 py-3 text-muted">{p.partner?.name || <span className="text-line">—</span>}</td>
                      <td className="px-4 py-3">
                        <Badge tone={DIRECTION_TONE[p.direction]}>{DIRECTION_LABEL[p.direction]}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted">{p.journal?.name || <span className="text-line">—</span>}</td>
                      <td className="px-4 py-3">
                        {s ? (
                          <Link href={s.href} onClick={(e) => e.stopPropagation()} className="tnum text-pine hover:underline">
                            {s.label}
                          </Link>
                        ) : (
                          <span className="text-line">—</span>
                        )}
                      </td>
                      <td className="tnum px-4 py-3 text-right text-ink">{formatMoney(p.amount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-4 py-2.5 text-xs text-muted">
            {filtered.length} {filtered.length === 1 ? "payment" : "payments"}
            {payments && payments.length >= 100 ? " · showing the latest 100" : ""}
          </div>
        </div>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="border-b border-line px-4 py-3">
        <div className="h-3 w-40 rounded bg-line/50" />
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 border-b border-line px-4 py-3.5 last:border-0">
          <div className="h-3 w-24 rounded bg-line/50" />
          <div className="h-3 w-28 rounded bg-line/50" />
          <div className="h-5 w-16 rounded-full bg-line/40" />
          <div className="ml-auto h-3 w-16 rounded bg-line/40" />
        </div>
      ))}
    </div>
  );
}
