"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { parseCents } from "@/lib/journalEntries";

// Bill/Invoice payment, laid out per the mockup's Payment screen. The backend derives RECEIVE
// (invoice) / SEND (bill) from the document — the Payment Type is shown but set automatically.
// A payment posts as CONFIRMED in one atomic step (there is no draft/cancel step server-side),
// so the status track reflects that rather than offering a fake lifecycle.
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
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
          paymentDate,
          ...(note.trim() ? { note: note.trim() } : {}),
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
    <form onSubmit={onSubmit} className="rounded-lg border border-line bg-surface p-5 print:border-0 print:p-0">
      {/* Header: title · action buttons + ⚙ · status track */}
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="font-display text-lg text-ink">{receive ? "Receive payment" : "Send payment"}</p>
        <div className="flex items-center gap-3">
          <StatusTrack />
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="More options"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex h-9 w-9 items-center justify-center rounded-md border border-line text-muted transition-colors hover:bg-line/50 hover:text-ink"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 z-10 mt-1 w-44 rounded-md border border-line bg-surface py-1 shadow-lg">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    window.print();
                  }}
                  className="block w-full px-3 py-2 text-left text-sm text-ink hover:bg-paper"
                >
                  Print
                </button>
                <button
                  type="button"
                  role="menuitem"
                  disabled
                  title="Email delivery isn't configured"
                  className="block w-full cursor-not-allowed px-3 py-2 text-left text-sm text-muted/60"
                >
                  Send by email
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="mt-3 rounded-md border-l-2 border-oxblood bg-oxblood/5 px-3 py-2 text-sm text-oxblood">
          {error}
        </div>
      )}

      {/* Payment Type — set automatically from the document (invoice = Receive, bill = Send). */}
      <fieldset className="mt-4">
        <legend className="text-sm font-medium text-ink">Payment Type</legend>
        <div className="mt-1.5 flex flex-wrap items-center gap-5 text-sm">
          <label className="inline-flex items-center gap-2 text-ink">
            <input type="radio" name="pf-type" checked={!receive} disabled className="accent-pine" /> Send
          </label>
          <label className="inline-flex items-center gap-2 text-ink">
            <input type="radio" name="pf-type" checked={receive} disabled className="accent-pine" /> Receive
          </label>
          <span className="text-xs text-muted">Set automatically from the document</span>
        </div>
      </fieldset>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <FormField label="Partner" htmlFor="pf-partner">
          <Input id="pf-partner" value={partnerName ?? "—"} disabled />
        </FormField>
        <FormField label="Date" htmlFor="pf-date">
          <Input id="pf-date" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
        </FormField>
        <FormField label="Amount" htmlFor="pf-amount" error={amountError ?? undefined} hint={`Amount due ${formatMoney(amountDue)}`}>
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
        <FormField label="Payment Via" htmlFor="pf-method">
          <Select id="pf-method" value={method} onChange={(e) => setMethod(e.target.value as "BANK" | "CASH")}>
            <option value="BANK">Bank</option>
            <option value="CASH">Cash</option>
          </Select>
        </FormField>
      </div>

      <div className="mt-4">
        <FormField label="Note" htmlFor="pf-note">
          <Input id="pf-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional reference or memo" />
        </FormField>
      </div>

      <div className="mt-5 flex items-center gap-3 print:hidden">
        <Button type="submit" loading={busy}>
          Confirm payment
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// A payment is recorded as Confirmed in one step (the ledger entry posts atomically). The track
// shows that outcome; Draft/Cancelled are not separate server states, so they are shown inactive.
function StatusTrack() {
  return (
    <div className="flex items-center gap-1 text-xs" aria-label="Payment posts as Confirmed">
      <span className="rounded px-2 py-0.5 bg-line/50 text-muted">Draft</span>
      <span className="text-muted">›</span>
      <span className="rounded bg-pine px-2 py-0.5 font-medium text-paper">Confirmed</span>
      <span className="text-muted">›</span>
      <span className="rounded px-2 py-0.5 bg-line/50 text-muted">Cancelled</span>
    </div>
  );
}
