"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/format";
import { formatEntryDate } from "@/lib/journalEntries";
import { ORDER_STATE_LABEL, ORDER_STATE_TONE, type SalesOrderDetail as SO } from "@/lib/salesOrders";
import type { AnalyticAccount } from "@/lib/analyticAccounts";

export function SalesOrderDetail({ id }: { id: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<SO | null>(null);
  const [analyticById, setAnalyticById] = useState<Map<string, string>>(new Map());
  const [status, setStatus] = useState<"loading" | "error" | "notfound" | "ready">("loading");
  const [pending, setPending] = useState<"confirm" | "invoice" | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const [soRes, anRes] = await Promise.all([
        apiFetch<{ salesOrder: SO }>(`/api/sales-orders/${id}`),
        apiFetch<{ analyticAccounts: AnalyticAccount[] }>("/api/analytic-accounts").catch(() => ({ analyticAccounts: [] })),
      ]);
      setOrder(soRes.salesOrder);
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
      await apiFetch(`/api/sales-orders/${id}/confirm`, { method: "POST", body: "{}" });
      setPending(null);
      await load();
    } catch (e) {
      setActionError(e instanceof ApiRequestError ? e.message : "Couldn't confirm the order.");
    } finally {
      setBusy(false);
    }
  }

  async function createInvoice() {
    setBusy(true);
    setActionError(null);
    try {
      const res = await apiFetch<{ invoice: { id: string } }>(`/api/sales-orders/${id}/invoice`, {
        method: "POST",
        body: "{}",
      });
      router.push(`/invoices/${res.invoice.id}`);
    } catch (e) {
      setBusy(false);
      setActionError(e instanceof ApiRequestError ? e.message : "Couldn't create the invoice.");
    }
  }

  if (status === "loading") return <DetailSkeleton />;
  if (status === "notfound") {
    return (
      <Panel>
        <p className="font-display text-lg text-ink">Sales order not found</p>
        <Link href="/sales-orders" className="mt-5 inline-block">
          <Button variant="ghost">Back to sales orders</Button>
        </Link>
      </Panel>
    );
  }
  if (status === "error" || !order) {
    return (
      <Panel>
        <p className="text-sm text-oxblood">Couldn&rsquo;t load this sales order.</p>
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
        <Actions
          order={order}
          pending={pending}
          setPending={setPending}
          busy={busy}
          onConfirm={confirmOrder}
          onInvoice={createInvoice}
        />
      </div>

      {actionError && (
        <div role="alert" className="rounded-md border-l-2 border-oxblood bg-oxblood/5 px-3 py-2 text-sm text-oxblood">
          {actionError}
        </div>
      )}

      <dl className="grid gap-4 rounded-lg border border-line bg-surface p-6 sm:grid-cols-3">
        <Field label="Customer" value={order.customer?.name ?? "—"} />
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

      {order.invoice && (
        <p className="text-sm text-muted">
          Invoiced as{" "}
          <Link href={`/invoices/${order.invoice.id}`} className="tnum font-medium text-pine hover:underline">
            {order.invoice.number}
          </Link>{" "}
          ({order.invoice.state.toLowerCase()}).
        </p>
      )}
    </div>
  );
}

function Actions({
  order,
  pending,
  setPending,
  busy,
  onConfirm,
  onInvoice,
}: {
  order: SO;
  pending: "confirm" | "invoice" | null;
  setPending: (p: "confirm" | "invoice" | null) => void;
  busy: boolean;
  onConfirm: () => void;
  onInvoice: () => void;
}) {
  // Contextual: a draft order can be confirmed; a confirmed order (not yet invoiced) can generate one.
  if (order.state === "DRAFT") {
    return pending === "confirm" ? (
      <ConfirmBar label="Confirm this order?" onYes={onConfirm} onNo={() => setPending(null)} busy={busy} yes="Confirm order" />
    ) : (
      <Button onClick={() => setPending("confirm")}>Confirm order</Button>
    );
  }
  if (order.state === "CONFIRMED" && !order.invoice) {
    return pending === "invoice" ? (
      <ConfirmBar label="Create a customer invoice from this order?" onYes={onInvoice} onNo={() => setPending(null)} busy={busy} yes="Create invoice" />
    ) : (
      <Button onClick={() => setPending("invoice")}>Create invoice</Button>
    );
  }
  return null;
}

function ConfirmBar({ label, onYes, onNo, busy, yes }: { label: string; onYes: () => void; onNo: () => void; busy: boolean; yes: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted">{label}</span>
      <Button onClick={onYes} loading={busy}>
        {yes}
      </Button>
      <Button variant="ghost" onClick={onNo} disabled={busy}>
        Cancel
      </Button>
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
