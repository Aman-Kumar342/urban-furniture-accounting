import type { DocState, PaymentStatus } from "@/lib/invoices";

// Vendor bills share DocState/PaymentStatus and their label/tone maps with invoices
// (imported from lib/invoices, not duplicated).
export interface BillRow {
  id: string;
  number: string;
  reference: string | null;
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

export interface BillAllocation {
  id: string;
  amount: string;
  payment: { journal: { type: "SALES" | "PURCHASE" | "BANK" | "CASH" | "MISC" } } | null;
}

export interface BillDetail extends BillRow {
  lines: BillLine[];
  journalEntry: { id: string; number: string } | null;
  allocations: BillAllocation[];
}

// Split the paid amount by the settling payment's journal (Cash vs Bank), for the bill footer.
export function paidByMethod(allocations: BillAllocation[]): { cash: number; bank: number } {
  let cash = 0;
  let bank = 0;
  for (const a of allocations) {
    const cents = Math.round(Number(a.amount) * 100);
    if (a.payment?.journal.type === "CASH") cash += cents;
    else bank += cents;
  }
  return { cash: cash / 100, bank: bank / 100 };
}
