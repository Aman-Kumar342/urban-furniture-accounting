import type { BadgeTone } from "@/components/ui/Badge";

export type PaymentDirection = "RECEIVE" | "SEND";
export type PaymentState = "DRAFT" | "CONFIRMED" | "CANCELLED";

export interface PaymentAllocationRow {
  id: string;
  invoiceId: string | null;
  billId: string | null;
  amount: string;
}

export interface PaymentRow {
  id: string;
  number: string;
  direction: PaymentDirection;
  partnerId: string;
  partner: { id: string; name: string } | null;
  journalId: string;
  journal: { id: string; name: string; type: string } | null;
  paymentDate: string;
  amount: string;
  state: PaymentState;
  note: string | null;
  journalEntryId: string | null;
  allocations: PaymentAllocationRow[];
  createdAt: string;
}

export interface PaymentAllocationDetail extends PaymentAllocationRow {
  invoice: { id: string; number: string } | null;
  bill: { id: string; number: string } | null;
}

export interface PaymentJournalItem {
  id: string;
  accountId: string;
  debit: string;
  credit: string;
  partnerId: string | null;
  label: string | null;
}

export interface PaymentDetail extends Omit<PaymentRow, "allocations"> {
  allocations: PaymentAllocationDetail[];
  journalEntry: { id: string; number: string; items: PaymentJournalItem[] } | null;
}

export const DIRECTION_LABEL: Record<PaymentDirection, string> = { RECEIVE: "Received", SEND: "Sent" };
export const DIRECTION_TONE: Record<PaymentDirection, BadgeTone> = { RECEIVE: "income", SEND: "walnut" };
