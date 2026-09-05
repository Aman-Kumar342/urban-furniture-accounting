import { prisma } from "@/lib/prisma";
import { round2 } from "@/lib/money";
import { NotFound, Conflict } from "@/lib/errors";
import { postEntry } from "./posting.service";
import { nextNumber } from "./numbering.service";
import { assertPayable, deriveStatus } from "./sales.calc";
import type { CreatePaymentInput } from "@/server/validation/sales";

/**
 * Receive a customer payment against an invoice. The ENTIRE operation runs in ONE
 * transaction using the same client: lock invoice -> validate -> create Payment ->
 * postEntry(Dr Bank/Cash / Cr Debtors) -> allocate -> update invoice amounts/status.
 * If any step fails, everything rolls back.
 */
export async function receivePayment(input: CreatePaymentInput, userId?: string) {
  const amount = round2(input.amount);

  return prisma.$transaction(async (tx) => {
    // Row lock: two concurrent payments cannot both consume the same amountDue.
    await tx.$queryRaw`SELECT id FROM "CustomerInvoice" WHERE id = ${input.invoiceId} FOR UPDATE`;

    const inv = await tx.customerInvoice.findUnique({ where: { id: input.invoiceId } });
    if (!inv) throw NotFound("Invoice not found.");
    if (inv.state !== "CONFIRMED") {
      throw Conflict("Invoice must be confirmed before it can be paid.");
    }

    assertPayable(amount, round2(inv.amountDue)); // > 0 and no overpayment

    const journalType = input.method === "CASH" ? "CASH" : "BANK";
    const journal = await tx.journal.findFirstOrThrow({ where: { type: journalType } });
    const cashOrBank = await tx.account.findUniqueOrThrow({ where: { id: journal.defaultAccountId } });
    const debtors = await tx.account.findUniqueOrThrow({ where: { name: "Debtors A/c" } });

    const paymentDate = input.paymentDate ?? new Date();
    const number = await nextNumber(tx, "PAY", paymentDate.getFullYear());

    const payment = await tx.payment.create({
      data: {
        number,
        direction: "RECEIVE",
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
    const status = deriveStatus(round2(inv.amountTotal), newPaid);

    const invoice = await tx.customerInvoice.update({
      where: { id: inv.id },
      data: { amountPaid: newPaid, amountDue: newDue, paymentStatus: status },
    });

    return { payment, entry, invoice };
  });
}
