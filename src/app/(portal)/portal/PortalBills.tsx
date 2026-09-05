"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/format";
import { formatEntryDate } from "@/lib/journalEntries";
import { PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE } from "@/lib/invoices";
import type { BillRow } from "@/lib/bills";

type Display = "DRAFT" | "NOT_PAID" | "PARTIAL" | "PAID";
const displayOf = (b: BillRow): Display => (b.state === "DRAFT" ? "DRAFT" : b.paymentStatus);
const LABEL: Record<Display, string> = { DRAFT: "Draft", ...PAYMENT_STATUS_LABEL };
const TONE = { DRAFT: "neutral", ...PAYMENT_STATUS_TONE } as const;

export function PortalBills() {
  const router = useRouter();
  const [bills, setBills] = useState<BillRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ bills: BillRow[] }>("/api/bills");
      setBills(res.bills);
    } catch {
      setError("Couldn't load your bills. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5">
      <h1 className="font-display text-2xl text-ink">Your bills</h1>

      {loading ? (
        <div className="h-40 rounded-lg border border-line bg-surface" />
      ) : error ? (
        <div className="rounded-lg border border-line bg-surface p-8 text-center">
          <p className="text-sm text-oxblood">{error}</p>
          <Button variant="ghost" onClick={load} className="mt-4 h-9 px-3 text-sm">
            Try again
          </Button>
        </div>
      ) : !bills || bills.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-14 text-center">
          <p className="font-display text-lg text-ink">No bills</p>
          <p className="mt-1 text-sm text-muted">Any bills raised to you will appear here.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium text-muted">
                  <th className="px-4 py-3 font-medium">Bill</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Due</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 text-right font-medium">Amount due</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => {
                  const d = displayOf(b);
                  return (
                    <tr key={b.id} onClick={() => router.push(`/portal/bills/${b.id}`)} className="cursor-pointer border-b border-line last:border-0 transition-colors hover:bg-paper/60">
                      <td className="px-4 py-3">
                        <Link href={`/portal/bills/${b.id}`} onClick={(e) => e.stopPropagation()} className="tnum font-medium text-ink hover:text-pine hover:underline">
                          {b.number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted">{formatEntryDate(b.billDate)}</td>
                      <td className="px-4 py-3 text-muted">{b.dueDate ? formatEntryDate(b.dueDate) : "—"}</td>
                      <td className="tnum px-4 py-3 text-right text-ink">{formatMoney(b.amountTotal)}</td>
                      <td className="tnum px-4 py-3 text-right text-ink">{formatMoney(b.amountDue)}</td>
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
