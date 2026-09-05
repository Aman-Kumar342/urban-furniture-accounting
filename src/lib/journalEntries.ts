import type { BadgeTone } from "@/components/ui/Badge";

export type EntryState = "DRAFT" | "POSTED" | "CANCELLED";
export type SourceType = "MANUAL" | "INVOICE" | "BILL" | "PAYMENT" | "OPENING";

export interface JournalEntryRow {
  id: string;
  number: string;
  journalId: string;
  journal: { id: string; name: string; type: string } | null;
  date: string;
  reference: string | null;
  state: EntryState;
  sourceType: SourceType;
  partnerId: string | null;
  partner: { id: string; name: string } | null;
  amount: string;
  createdAt: string;
}

export interface JournalItemDetail {
  id: string;
  accountId: string;
  account: { id: string; code: string; name: string; type: string } | null;
  partnerId: string | null;
  partner: { id: string; name: string } | null;
  analyticAccountId: string | null;
  analyticAccount: { id: string; name: string; type: string } | null;
  label: string | null;
  debit: string;
  credit: string;
}

export interface JournalEntryDetail extends JournalEntryRow {
  sourceId: string | null;
  items: JournalItemDetail[];
}

export const ENTRY_STATE_LABEL: Record<EntryState, string> = {
  DRAFT: "Draft",
  POSTED: "Posted",
  CANCELLED: "Cancelled",
};

export const ENTRY_STATE_TONE: Record<EntryState, BadgeTone> = {
  DRAFT: "neutral",
  POSTED: "income",
  CANCELLED: "oxblood",
};

export const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  MANUAL: "Manual",
  INVOICE: "Invoice",
  BILL: "Bill",
  PAYMENT: "Payment",
  OPENING: "Opening",
};

// Parse a user-entered non-negative money string to integer cents (exact, no floats). Returns
// null for malformed input. Empty string -> 0. Only used for the informational balance display.
export function parseCents(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const [i, d = ""] = t.split(".");
  return parseInt(i, 10) * 100 + parseInt((d + "00").slice(0, 2), 10);
}

// Integer cents -> a "12345.67" style string, for formatMoney. No float arithmetic.
export function centsToDecimal(cents: number): string {
  const neg = cents < 0;
  const a = Math.abs(cents);
  return `${neg ? "-" : ""}${Math.floor(a / 100)}.${String(a % 100).padStart(2, "0")}`;
}

export function formatEntryDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
