import { prisma } from "@/lib/prisma";
import { round2 } from "@/lib/money";
import { NotFound, Conflict, Unprocessable } from "@/lib/errors";
import { postEntry, type PostedEntry } from "./posting.service";
import { nextNumber } from "./numbering.service";
import { assertPayable, deriveStatus } from "./sales.calc";
import type { CreatePaymentInput } from "@/server/validation/sales";
import type { Payment, CustomerInvoice, VendorBill } from "@prisma/client";

export type PaymentResult = {
  payment: Payment;
  entry: PostedEntry;
  invoice?: CustomerInvoice;
  bill?: VendorBill;
};

/**
 * Register a payment against exactly ONE document — a customer invoice or a vendor bill.
 * The whole operation runs in ONE transaction with the same client: lock the document ->
 * validate -> create Payment -> postEntry(...) -> allocate -> update the document's
 * amounts/status. Any failure rolls back everything.
 *
 * Direction is DERIVED from the document (never trusted from the client):
 *   invoice -> RECEIVE -> Dr Bank/Cash, Cr Debtors
 *   bill    -> SEND    -> Dr Creditors, Cr Bank/Cash
 */
export async function registerPayment(
  input: CreatePaymentInput,
  userId?: string,
): Promise<PaymentResult> {
  const payingInvoice = Boolean(input.invoiceId);
  const payingBill = Boolean(input.billId);
  if (payingInvoice === payingBill) {
    throw Unprocessable("INVALID_TARGET", "Provide exactly one of invoiceId or billId.");
  }
  const amount = round2(input.amount);

  return prisma.$transaction(async (tx) => {
    const journalType = input.method === "CASH" ? "CASH" : "BANK";
    const journal = await tx.journal.findFirstOrThrow({ where: { type: journalType } });
    const cashOrBank = await tx.account.findUniqueOrThrow({ where: { id: journal.defaultAccountId } });
    const paymentDate = input.paymentDate ?? new Date();

    if (payingInvoice) {
      // Row lock so concurrent payments cannot both consume the same amountDue.
      await tx.$queryRaw`SELECT id FROM "CustomerInvoice" WHERE id = ${input.invoiceId} FOR UPDATE`;
      const inv = await tx.customerInvoice.findUnique({ where: { id: input.invoiceId! } });
      if (!inv) throw NotFound("Invoice not found.");
      if (inv.state !== "CONFIRMED") throw Conflict("Invoice must be confirmed before it can be paid.");
      assertPayable(amount, round2(inv.amountDue));

      const debtors = await tx.account.findUniqueOrThrow({ where: { name: "Debtors A/c" } });
      const number = await nextNumber(tx, "PAY", paymentDate.getFullYear());
      const payment = await tx.payment.create({
        data: {
          number,
          direction: "RECEIVE", // derived from the document type
          partnerId: inv.customerId,
          journalId: journal.id,
          paymentDate,
          amount,
          state: "CONFIRMED",
          note: input.note ?? null,
          createdById: userId ?? null,
        },
      });
      const entry = await postEntry(
        {
          journalId: journal.id,
          date: paymentDate,
          sourceType: "PAYMENT",
          sourceId: payment.id,
          reference: payment.number,
          partnerId: inv.customerId,
          createdById: userId ?? null,
          number: payment.number,
          lines: [
            { accountId: cashOrBank.id, debit: amount, partnerId: inv.customerId, label: `Payment ${payment.number}` },
            { accountId: debtors.id, credit: amount, partnerId: inv.customerId, label: `Payment ${payment.number}` },
          ],
        },
        tx,
      );
      await tx.payment.update({ where: { id: payment.id }, data: { journalEntryId: entry.id } });
      await tx.paymentAllocation.create({ data: { paymentId: payment.id, invoiceId: inv.id, amount } });

      const newPaid = round2(inv.amountPaid.plus(amount));
      const newDue = round2(inv.amountTotal.minus(newPaid));
      const invoice = await tx.customerInvoice.update({
        where: { id: inv.id },
        data: { amountPaid: newPaid, amountDue: newDue, paymentStatus: deriveStatus(round2(inv.amountTotal), newPaid) },
      });
      return { payment, entry, invoice };
    }

    // Paying a vendor bill -> SEND.
    await tx.$queryRaw`SELECT id FROM "VendorBill" WHERE id = ${input.billId} FOR UPDATE`;
    const bill = await tx.vendorBill.findUnique({ where: { id: input.billId! } });
    if (!bill) throw NotFound("Bill not found.");
    if (bill.state !== "CONFIRMED") throw Conflict("Bill must be confirmed before it can be paid.");
    assertPayable(amount, round2(bill.amountDue));

    const creditors = await tx.account.findUniqueOrThrow({ where: { name: "Creditors A/c" } });
    const number = await nextNumber(tx, "PAY", paymentDate.getFullYear());
    const payment = await tx.payment.create({
      data: {
        number,
        direction: "SEND", // derived from the document type
        partnerId: bill.vendorId,
        journalId: journal.id,
        paymentDate,
        amount,
        state: "CONFIRMED",
        note: input.note ?? null,
        createdById: userId ?? null,
      },
    });
    const entry = await postEntry(
      {
        journalId: journal.id,
        date: paymentDate,
        sourceType: "PAYMENT",
        sourceId: payment.id,
        reference: payment.number,
        partnerId: bill.vendorId,
        createdById: userId ?? null,
        number: payment.number,
        lines: [
          { accountId: creditors.id, debit: amount, partnerId: bill.vendorId, label: `Payment ${payment.number}` },
          { accountId: cashOrBank.id, credit: amount, partnerId: bill.vendorId, label: `Payment ${payment.number}` },
        ],
      },
      tx,
    );
    await tx.payment.update({ where: { id: payment.id }, data: { journalEntryId: entry.id } });
    await tx.paymentAllocation.create({ data: { paymentId: payment.id, billId: bill.id, amount } });

    const newPaid = round2(bill.amountPaid.plus(amount));
    const newDue = round2(bill.amountTotal.minus(newPaid));
    const updatedBill = await tx.vendorBill.update({
      where: { id: bill.id },
      data: { amountPaid: newPaid, amountDue: newDue, paymentStatus: deriveStatus(round2(bill.amountTotal), newPaid) },
    });
    return { payment, entry, bill: updatedBill };
  });
}
