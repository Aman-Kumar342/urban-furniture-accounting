"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { parseCents } from "@/lib/journalEntries";

// One payment form for both directions. The backend derives RECEIVE (invoice) / SEND (bill) from
// the document — the client only says which document and how much. Never sends a direction.
export function PaymentForm({
  kind,
  targetId,
  partnerName,
  amountDue,
  onDone,
  onCancel,
}: {
  kind: "invoice" | "bill";
  targetId: string;
  partnerName?: string;
  amountDue: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const receive = kind === "invoice";
  const [method, setMethod] = useState<"BANK" | "CASH">("BANK");
  const [amount, setAmount] = useState(() => amountDue);
  const [error, setError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const dueCents = parseCents(amountDue) ?? 0;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const cents = parseCents(amount);
    if (cents === null || cents <= 0) {
      setAmountError("Enter a valid amount greater than zero.");
      return;
    }
    if (cents > dueCents) {
      setAmountError(`Amount can't exceed the amount due (${formatMoney(amountDue)}).`);
      return;
    }
    setAmountError(null);
    setBusy(true);
    try {
      await apiFetch("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          [receive ? "invoiceId" : "billId"]: targetId,
          method,
          amount: Number(amount),
        }),
      });
      onDone();
    } catch (err) {
      setBusy(false);
      if (err instanceof ApiRequestError) {
        if (err.code === "VALIDATION") setError("Check the amount and payment method.");
        else setError(err.message); // 409 not-confirmed, 422 over-amount, etc.
      } else {
        setError("Can't reach the server. Check your connection and try again.");
      }
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink">{receive ? "Receive payment" : "Send payment"}</p>
        <span className="rounded-full border border-line bg-paper px-2 py-0.5 text-xs font-medium text-muted">
          {receive ? "Receive" : "Send"} · set automatically
        </span>
      </div>

      {error && (
        <div role="alert" className="mt-3 rounded-md border-l-2 border-oxblood bg-oxblood/5 px-3 py-2 text-sm text-oxblood">
          {error}
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {partnerName && (
          <FormField label="Partner" htmlFor="pf-partner">
            <Input id="pf-partner" value={partnerName} disabled />
          </FormField>
        )}
        <FormField label="Amount due" htmlFor="pf-due">
          <Input id="pf-due" className="tnum text-right" value={formatMoney(amountDue)} disabled />
        </FormField>
        <FormField label="Method" htmlFor="pf-method">
          <Select id="pf-method" value={method} onChange={(e) => setMethod(e.target.value as "BANK" | "CASH")}>
            <option value="BANK">Bank</option>
            <option value="CASH">Cash</option>
          </Select>
        </FormField>
        <FormField label="Amount" htmlFor="pf-amount" error={amountError ?? undefined}>
          <Input
            id="pf-amount"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            className="tnum text-right"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setAmountError(null);
            }}
            invalid={!!amountError}
            autoFocus
          />
        </FormField>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button type="submit" loading={busy}>
          {receive ? "Receive payment" : "Send payment"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
