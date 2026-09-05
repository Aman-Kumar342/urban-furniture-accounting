import type { BadgeTone } from "@/components/ui/Badge";

export type DocState = "DRAFT" | "CONFIRMED" | "CANCELLED";
export type PaymentStatus = "NOT_PAID" | "PARTIAL" | "PAID";

export interface InvoiceRow {
  id: string;
  number: string;
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

export interface InvoiceDetail extends InvoiceRow {
  lines: InvoiceLine[];
  journalEntry: { id: string; number: string } | null;
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
