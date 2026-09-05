"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/format";
import { formatEntryDate } from "@/lib/journalEntries";
import { ORDER_STATE_LABEL, ORDER_STATE_TONE } from "@/lib/salesOrders";
import type { PurchaseOrderDetail as PO } from "@/lib/purchaseOrders";
import type { AnalyticAccount } from "@/lib/analyticAccounts";

export function PurchaseOrderDetail({ id }: { id: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<PO | null>(null);
  const [analyticById, setAnalyticById] = useState<Map<string, string>>(new Map());
  const [status, setStatus] = useState<"loading" | "error" | "notfound" | "ready">("loading");
  const [pending, setPending] = useState<"confirm" | "bill" | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const [poRes, anRes] = await Promise.all([
        apiFetch<{ purchaseOrder: PO }>(`/api/purchase-orders/${id}`),
        apiFetch<{ analyticAccounts: AnalyticAccount[] }>("/api/analytic-accounts").catch(() => ({ analyticAccounts: [] })),
      ]);
      setOrder(poRes.purchaseOrder);
      setAnalyticById(new Map(anRes.analyticAccounts.map((a) => [a.id, a.name])));
      setStatus("ready");
    } catch (e) {
      setStatus(e instanceof ApiRequestError && e.code === "NOT_FOUND" ? "notfound" : "error");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmOrder() {
    setBusy(true);
    setActionError(null);
    try {
      const res = await apiFetch<{ warnings: string[] }>(`/api/purchase-orders/${id}/confirm`, { method: "POST", body: "{}" });
      setWarnings(res.warnings ?? []);
      setPending(null);
      await load();
    } catch (e) {
      setActionError(e instanceof ApiRequestError ? e.message : "Couldn't confirm the order.");
    } finally {
      setBusy(false);
    }
  }

  async function createBill() {
    setBusy(true);
    setActionError(null);
    try {
      const res = await apiFetch<{ bill: { id: string } }>(`/api/purchase-orders/${id}/bill`, { method: "POST", body: "{}" });
      router.push(`/bills/${res.bill.id}`);
    } catch (e) {
      setBusy(false);
      setActionError(e instanceof ApiRequestError ? e.message : "Couldn't create the bill.");
    }
  }

  if (status === "loading") return <DetailSkeleton />;
  if (status === "notfound") {
    return (
      <Panel>
        <p className="font-display text-lg text-ink">Purchase order not found</p>
        <Link href="/purchase-orders" className="mt-5 inline-block">
          <Button variant="ghost">Back to purchase orders</Button>
        </Link>
      </Panel>
    );
  }
  if (status === "error" || !order) {
    return (
      <Panel>
        <p className="text-sm text-oxblood">Couldn&rsquo;t load this purchase order.</p>
        <Button variant="ghost" onClick={load} className="mt-4 h-9 px-3 text-sm">
          Try again
        </Button>
      </Panel>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h2 className="tnum font-display text-xl text-ink">{order.number}</h2>
          <Badge tone={ORDER_STATE_TONE[order.state]}>{ORDER_STATE_LABEL[order.state]}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {order.state === "DRAFT" &&
            (pending === "confirm" ? (
              <>
                <span className="text-sm text-muted">Confirm this order?</span>
                <Button onClick={confirmOrder} loading={busy}>
                  Confirm order
                </Button>
                <Button variant="ghost" onClick={() => setPending(null)} disabled={busy}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button onClick={() => setPending("confirm")}>Confirm order</Button>
            ))}
          {order.state === "CONFIRMED" &&
            !order.bill &&
            (pending === "bill" ? (
              <>
                <span className="text-sm text-muted">Create a vendor bill from this order?</span>
                <Button onClick={createBill} loading={busy}>
                  Create bill
                </Button>
                <Button variant="ghost" onClick={() => setPending(null)} disabled={busy}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button onClick={() => setPending("bill")}>Create bill</Button>
            ))}
        </div>
      </div>

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

      <dl className="grid gap-4 rounded-lg border border-line bg-surface p-6 sm:grid-cols-3">
        <Field label="Vendor" value={order.vendor?.name ?? "—"} />
        <Field label="Order date" value={formatEntryDate(order.orderDate)} />
        <Field label="Total" value={formatMoney(order.amountTotal)} mono />
      </dl>

      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium text-muted">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Budget analytics</th>
                <th className="px-4 py-3 text-right font-medium">Qty</th>
                <th className="px-4 py-3 text-right font-medium">Unit price</th>
                <th className="px-4 py-3 text-right font-medium">Line total</th>
              </tr>
            </thead>
            <tbody>
              {order.lines.map((l) => (
                <tr key={l.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 text-ink">{l.product?.name || <span className="text-line">—</span>}</td>
                  <td className="px-4 py-3 text-muted">
                    {l.analyticAccountId ? analyticById.get(l.analyticAccountId) ?? "—" : <span className="text-line">—</span>}
                  </td>
                  <td className="tnum px-4 py-3 text-right text-muted">{Number(l.quantity)}</td>
                  <td className="tnum px-4 py-3 text-right text-muted">{formatMoney(l.unitPrice)}</td>
                  <td className="tnum px-4 py-3 text-right text-ink">{formatMoney(l.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-line bg-paper/40 font-medium">
                <td className="px-4 py-3 text-muted" colSpan={4}>
                  Total
                </td>
                <td className="tnum px-4 py-3 text-right text-ink">{formatMoney(order.amountTotal)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {order.bill && (
        <p className="text-sm text-muted">
          Billed as{" "}
          <Link href={`/bills/${order.bill.id}`} className="tnum font-medium text-pine hover:underline">
            {order.bill.number}
          </Link>{" "}
          ({order.bill.state.toLowerCase()}).
        </p>
      )}
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
      <div className="grid gap-4 rounded-lg border border-line bg-surface p-6 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 rounded bg-line/40" />
        ))}
      </div>
      <div className="h-32 rounded-lg border border-line bg-surface" />
    </div>
  );
}
