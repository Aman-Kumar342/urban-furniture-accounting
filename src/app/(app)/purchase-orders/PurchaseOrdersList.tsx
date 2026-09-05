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
import { ORDER_STATE_LABEL, ORDER_STATE_TONE, type OrderState } from "@/lib/salesOrders";
import type { PurchaseOrderRow } from "@/lib/purchaseOrders";

export function PurchaseOrdersList() {
  const router = useRouter();
  const [orders, setOrders] = useState<PurchaseOrderRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [stateFilter, setStateFilter] = useState<"ALL" | OrderState>("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ purchaseOrders: PurchaseOrderRow[] }>("/api/purchase-orders");
      setOrders(res.purchaseOrders);
    } catch (e) {
      setError(
        e instanceof ApiRequestError && e.code === "FORBIDDEN"
          ? "You don't have access to purchase orders."
          : "Couldn't load purchase orders. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!orders) return [];
    const needle = q.trim().toLowerCase();
    return orders.filter((o) => {
      if (stateFilter !== "ALL" && o.state !== stateFilter) return false;
      if (!needle) return true;
      return [o.number, o.vendor?.name].filter(Boolean).some((v) => v!.toLowerCase().includes(needle));
    });
  }, [orders, q, stateFilter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full max-w-xs sm:w-56">
            <Input type="search" placeholder="Search number or vendor…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search purchase orders" />
          </div>
          <div className="w-40">
            <Select value={stateFilter} onChange={(e) => setStateFilter(e.target.value as "ALL" | OrderState)} aria-label="Filter by status">
              <option value="ALL">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">Cancelled</option>
            </Select>
          </div>
        </div>
        <Link href="/purchase-orders/new">
          <Button>New purchase order</Button>
        </Link>
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
          {q.trim() || stateFilter !== "ALL" ? (
            <p className="text-sm text-muted">No purchase orders match your search.</p>
          ) : (
            <>
              <p className="font-display text-lg text-ink">No purchase orders yet</p>
              <p className="mt-1 text-sm text-muted">Create a purchase order for a vendor to start the purchase flow.</p>
              <Link href="/purchase-orders/new" className="mt-5 inline-block">
                <Button>New purchase order</Button>
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium text-muted">
                  <th className="px-4 py-3 font-medium">Number</th>
                  <th className="px-4 py-3 font-medium">Vendor</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr key={o.id} onClick={() => router.push(`/purchase-orders/${o.id}`)} className="cursor-pointer border-b border-line last:border-0 transition-colors hover:bg-paper/60">
                    <td className="px-4 py-3">
                      <Link href={`/purchase-orders/${o.id}`} onClick={(e) => e.stopPropagation()} className="tnum font-medium text-ink hover:text-pine hover:underline">
                        {o.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{o.vendor?.name || <span className="text-line">—</span>}</td>
                    <td className="px-4 py-3 text-muted">{formatEntryDate(o.orderDate)}</td>
                    <td className="px-4 py-3 tnum text-right text-ink">{formatMoney(o.amountTotal)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={ORDER_STATE_TONE[o.state]}>{ORDER_STATE_LABEL[o.state]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-4 py-2.5 text-xs text-muted">
            {filtered.length} {filtered.length === 1 ? "purchase order" : "purchase orders"}
            {orders && orders.length >= 100 ? " · showing the latest 100" : ""}
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
