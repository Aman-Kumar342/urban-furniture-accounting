import type { DocState, PaymentStatus } from "@/lib/invoices";

// Vendor bills share DocState/PaymentStatus and their label/tone maps with invoices
// (imported from lib/invoices, not duplicated).
export interface BillRow {
  id: string;
  number: string;
  vendorId: string;
  purchaseOrderId: string | null;
  billDate: string;
  dueDate: string | null;
  state: DocState;
  paymentStatus: PaymentStatus;
  amountTotal: string;
  amountPaid: string;
  amountDue: string;
  journalEntryId: string | null;
  createdAt: string;
}

export interface BillLine {
  id: string;
  productId: string;
  accountId: string;
  analyticAccountId: string | null;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
}

export interface BillDetail extends BillRow {
  lines: BillLine[];
  journalEntry: { id: string; number: string } | null;
}
