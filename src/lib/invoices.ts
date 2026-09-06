import type { BadgeTone } from "@/components/ui/Badge";

export type DocState = "DRAFT" | "CONFIRMED" | "CANCELLED";
export type PaymentStatus = "NOT_PAID" | "PARTIAL" | "PAID";

export interface InvoiceRow {
  id: string;
  number: string;
  reference: string | null;
  customerId: string;
  salesOrderId: string | null;
  invoiceDate: string;
  dueDate: string | null;
  state: DocState;
  paymentStatus: PaymentStatus;
  amountTotal: string;
  amountPaid: string;
  amountDue: string;
  journalEntryId: string | null;
  createdAt: string;
}

export interface InvoiceLine {
  id: string;
  productId: string;
  accountId: string;
  analyticAccountId: string | null;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
}

export interface InvoiceAllocation {
  id: string;
  amount: string;
  payment: { journal: { type: "SALES" | "PURCHASE" | "BANK" | "CASH" | "MISC" } } | null;
}

export interface InvoiceDetail extends InvoiceRow {
  lines: InvoiceLine[];
  journalEntry: { id: string; number: string } | null;
  allocations: InvoiceAllocation[];
}

// Split the paid amount by the settling payment's journal (Cash vs Bank), for the invoice footer.
export function paidByMethod(allocations: InvoiceAllocation[]): { cash: number; bank: number } {
  let cash = 0;
  let bank = 0;
  for (const a of allocations) {
    const cents = Math.round(Number(a.amount) * 100);
    if (a.payment?.journal.type === "CASH") cash += cents;
    else bank += cents;
  }
  return { cash: cash / 100, bank: bank / 100 };
}

export const DOC_STATE_LABEL: Record<DocState, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
};

export const DOC_STATE_TONE: Record<DocState, BadgeTone> = {
  DRAFT: "neutral",
  CONFIRMED: "pine",
  CANCELLED: "oxblood",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  NOT_PAID: "Not paid",
  PARTIAL: "Partial",
  PAID: "Paid",
};

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, BadgeTone> = {
  NOT_PAID: "neutral",
  PARTIAL: "amber",
  PAID: "income",
};
