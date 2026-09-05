import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/money";
import { AppError } from "@/lib/errors";
import { createContact } from "@/server/services/contact.service";
import { createProduct } from "@/server/services/product.service";
import {
  createSalesOrder,
  confirmSalesOrder,
  createInvoiceFromSalesOrder,
} from "@/server/services/salesOrder.service";
import {
  confirmInvoice,
  getInvoiceForUser,
} from "@/server/services/invoice.service";
import { registerPayment } from "@/server/services/payment.service";

// Full Sales-flow integration test against the local dev DB (uses seeded accounts/journals).
let customerId: string;
let productId: string;
let debtorsId: string;
let salesIncomeId: string;
let bankId: string;

async function makeConfirmedInvoice(qty: number, price: number) {
  const so = await createSalesOrder({ customerId, lines: [{ productId, quantity: qty, unitPrice: price }] });
  await confirmSalesOrder(so.id);
  const inv = await createInvoiceFromSalesOrder(so.id);
  const { invoice, entry } = await confirmInvoice(inv.id);
  return { invoice, entry };
}

beforeAll(async () => {
  const contact = await createContact({
    name: "Test Customer",
    type: "CUSTOMER",
    email: `cust+${Date.now()}@uf.test`,
  });
  customerId = contact.id;
  const product = await createProduct({ name: "Test Chair", type: "GOODS", salesPrice: 2500, cost: 1500 });
  productId = product.id;
  debtorsId = (await prisma.account.findUniqueOrThrow({ where: { name: "Debtors A/c" } })).id;
  salesIncomeId = (await prisma.account.findUniqueOrThrow({ where: { name: "Sales Income A/c" } })).id;
  bankId = (await prisma.account.findUniqueOrThrow({ where: { name: "Bank A/c" } })).id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Sales flow", () => {
  it("invoice confirm posts Dr Debtors / Cr Sales Income (balanced)", async () => {
    const { invoice, entry } = await makeConfirmedInvoice(10, 2500); // total 25000
    expect(invoice.state).toBe("CONFIRMED");
    expect(entry.number).toBe(invoice.number); // JE number mirrors invoice number
    const debit = entry.items.find((i) => i.accountId === debtorsId);
    const credit = entry.items.find((i) => i.accountId === salesIncomeId);
    expect(debit?.debit.equals(25000)).toBe(true);
    expect(credit?.credit.equals(25000)).toBe(true);
    const totalDebit = entry.items.reduce((a, i) => a.plus(i.debit), money(0));
    const totalCredit = entry.items.reduce((a, i) => a.plus(i.credit), money(0));
    expect(totalDebit.equals(totalCredit)).toBe(true);
  });

  it("full payment posts Dr Bank / Cr Debtors and marks the invoice PAID", async () => {
    const { invoice } = await makeConfirmedInvoice(10, 2500); // 25000
    const { payment, entry, invoice: paid } = await registerPayment({ invoiceId: invoice.id, method: "BANK", amount: 25000 });
    expect(payment.direction).toBe("RECEIVE"); // derived from the invoice, not the client
    const debit = entry.items.find((i) => i.accountId === bankId);
    const credit = entry.items.find((i) => i.accountId === debtorsId);
    expect(debit?.debit.equals(25000)).toBe(true);
    expect(credit?.credit.equals(25000)).toBe(true);
    expect(paid!.paymentStatus).toBe("PAID");
    expect(paid!.amountDue.equals(0)).toBe(true);
  });

  it("partial payment marks PARTIAL then PAID", async () => {
    const { invoice } = await makeConfirmedInvoice(4, 1000); // 4000
    const p1 = await registerPayment({ invoiceId: invoice.id, method: "CASH", amount: 1500 });
    expect(p1.invoice!.paymentStatus).toBe("PARTIAL");
    expect(p1.invoice!.amountDue.equals(2500)).toBe(true);
    const p2 = await registerPayment({ invoiceId: invoice.id, method: "BANK", amount: 2500 });
    expect(p2.invoice!.paymentStatus).toBe("PAID");
    expect(p2.invoice!.amountDue.equals(0)).toBe(true);
  });

  it("rejects overpayment and writes nothing (rollback)", async () => {
    const { invoice } = await makeConfirmedInvoice(1, 1000); // 1000
    const before = await prisma.paymentAllocation.count({ where: { invoiceId: invoice.id } });
    await expect(
      registerPayment({ invoiceId: invoice.id, method: "BANK", amount: 1500 }),
    ).rejects.toBeInstanceOf(AppError);
    const after = await prisma.paymentAllocation.count({ where: { invoiceId: invoice.id } });
    expect(after).toBe(before); // no partial write
  });

  it("rejects payment on an unconfirmed invoice", async () => {
    const so = await createSalesOrder({ customerId, lines: [{ productId, quantity: 1, unitPrice: 1000 }] });
    await confirmSalesOrder(so.id);
    const draft = await createInvoiceFromSalesOrder(so.id); // not confirmed
    await expect(
      registerPayment({ invoiceId: draft.id, method: "BANK", amount: 1000 }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("rejects double-confirming an invoice", async () => {
    const so = await createSalesOrder({ customerId, lines: [{ productId, quantity: 1, unitPrice: 1000 }] });
    await confirmSalesOrder(so.id);
    const inv = await createInvoiceFromSalesOrder(so.id);
    await confirmInvoice(inv.id);
    await expect(confirmInvoice(inv.id)).rejects.toBeInstanceOf(AppError);
  });

  it("rejects invoicing an unconfirmed sales order", async () => {
    const so = await createSalesOrder({ customerId, lines: [{ productId, quantity: 1, unitPrice: 1000 }] });
    await expect(createInvoiceFromSalesOrder(so.id)).rejects.toBeInstanceOf(AppError);
  });

  it("enforces Contact ownership on invoice read", async () => {
    const { invoice } = await makeConfirmedInvoice(1, 1000);
    const owner = { role: "CONTACT", contactId: customerId } as User;
    const stranger = { role: "CONTACT", contactId: crypto.randomUUID() } as User;
    await expect(getInvoiceForUser(invoice.id, owner)).resolves.toBeTruthy();
    await expect(getInvoiceForUser(invoice.id, stranger)).rejects.toBeInstanceOf(AppError);
  });
});
