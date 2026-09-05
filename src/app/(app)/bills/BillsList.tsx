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
import { PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE } from "@/lib/invoices";
import type { BillRow } from "@/lib/bills";
import type { Contact } from "@/lib/contacts";

type Display = "DRAFT" | "NOT_PAID" | "PARTIAL" | "PAID";
const displayOf = (b: BillRow): Display => (b.state === "DRAFT" ? "DRAFT" : b.paymentStatus);
const DISPLAY_LABEL: Record<Display, string> = { DRAFT: "Draft", ...PAYMENT_STATUS_LABEL };
const DISPLAY_TONE = { DRAFT: "neutral", ...PAYMENT_STATUS_TONE } as const;

export function BillsList() {
  const router = useRouter();
  const [bills, setBills] = useState<BillRow[] | null>(null);
  const [vendorById, setVendorById] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"ALL" | Display>("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [b, c] = await Promise.all([
        apiFetch<{ bills: BillRow[] }>("/api/bills"),
        apiFetch<{ contacts: Contact[] }>("/api/contacts").catch(() => ({ contacts: [] })),
      ]);
      setBills(b.bills);
      setVendorById(new Map(c.contacts.map((x) => [x.id, x.name])));
    } catch (e) {
      setError(
        e instanceof ApiRequestError && e.code === "FORBIDDEN"
          ? "You don't have access to bills."
          : "Couldn't load bills. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!bills) return [];
    const needle = q.trim().toLowerCase();
    return bills.filter((b) => {
      if (filter !== "ALL" && displayOf(b) !== filter) return false;
      if (!needle) return true;
      const v = vendorById.get(b.vendorId) ?? "";
      return b.number.toLowerCase().includes(needle) || v.toLowerCase().includes(needle);
    });
  }, [bills, q, filter, vendorById]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full max-w-xs sm:w-56">
          <Input type="search" placeholder="Search number or vendor…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search bills" />
        </div>
        <div className="w-40">
          <Select value={filter} onChange={(e) => setFilter(e.target.value as "ALL" | Display)} aria-label="Filter by status">
            <option value="ALL">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="NOT_PAID">Not paid</option>
            <option value="PARTIAL">Partial</option>
            <option value="PAID">Paid</option>
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
          {q.trim() || filter !== "ALL" ? (
            <p className="text-sm text-muted">No bills match your search.</p>
          ) : (
            <>
              <p className="font-display text-lg text-ink">No bills yet</p>
              <p className="mt-1 text-sm text-muted">Confirm a purchase order and create a bill to see it here.</p>
              <Link href="/purchase-orders" className="mt-5 inline-block">
                <Button variant="ghost">Go to purchase orders</Button>
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium text-muted">
                  <th className="px-4 py-3 font-medium">Number</th>
                  <th className="px-4 py-3 font-medium">Vendor</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 text-right font-medium">Amount due</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => {
                  const d = displayOf(b);
                  return (
                    <tr key={b.id} onClick={() => router.push(`/bills/${b.id}`)} className="cursor-pointer border-b border-line last:border-0 transition-colors hover:bg-paper/60">
                      <td className="px-4 py-3">
                        <Link href={`/bills/${b.id}`} onClick={(e) => e.stopPropagation()} className="tnum font-medium text-ink hover:text-pine hover:underline">
                          {b.number}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted">{vendorById.get(b.vendorId) || <span className="text-line">—</span>}</td>
                      <td className="px-4 py-3 text-muted">{formatEntryDate(b.billDate)}</td>
                      <td className="tnum px-4 py-3 text-right text-ink">{formatMoney(b.amountTotal)}</td>
                      <td className="tnum px-4 py-3 text-right text-ink">{formatMoney(b.amountDue)}</td>
                      <td className="px-4 py-3">
                        <Badge tone={DISPLAY_TONE[d]}>{DISPLAY_LABEL[d]}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-4 py-2.5 text-xs text-muted">
            {filtered.length} {filtered.length === 1 ? "bill" : "bills"}
            {bills && bills.length >= 100 ? " · showing the latest 100" : ""}
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
          <div className="h-3 w-32 rounded bg-line/50" />
          <div className="ml-auto h-3 w-16 rounded bg-line/40" />
          <div className="h-5 w-16 rounded-full bg-line/40" />
        </div>
      ))}
    </div>
  );
}
