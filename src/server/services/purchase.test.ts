import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/money";
import { AppError } from "@/lib/errors";
import { createContact } from "@/server/services/contact.service";
import { createProduct } from "@/server/services/product.service";
import {
  createPurchaseOrder,
  confirmPurchaseOrder,
  createBillFromPurchaseOrder,
} from "@/server/services/purchaseOrder.service";
import { confirmBill, getBillForUser } from "@/server/services/bill.service";
import { registerPayment } from "@/server/services/payment.service";
import type { CreatePaymentInput } from "@/server/validation/sales";

// Full Purchase-flow integration test against the local dev DB (uses seeded accounts/journals).
let vendorId: string;
let productId: string;
let creditorsId: string;
let purchaseExpenseId: string;
let bankId: string;

async function makeConfirmedBill(qty: number, price: number) {
  const po = await createPurchaseOrder({ vendorId, lines: [{ productId, quantity: qty, unitPrice: price }] });
  await confirmPurchaseOrder(po.id);
  const bill = await createBillFromPurchaseOrder(po.id);
  return confirmBill(bill.id);
}

beforeAll(async () => {
  const vendor = await createContact({ name: "Azure Supplies", type: "VENDOR", email: `vend+${Date.now()}@uf.test` });
  vendorId = vendor.id;
  const product = await createProduct({ name: "Raw Timber", type: "GOODS", salesPrice: 0, cost: 1500 });
  productId = product.id;
  creditorsId = (await prisma.account.findUniqueOrThrow({ where: { name: "Creditors A/c" } })).id;
  purchaseExpenseId = (await prisma.account.findUniqueOrThrow({ where: { name: "Purchase Expense A/c" } })).id;
  bankId = (await prisma.account.findUniqueOrThrow({ where: { name: "Bank A/c" } })).id;
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Purchase flow", () => {
  it("bill confirm posts Dr Purchase Expense / Cr Creditors (balanced)", async () => {
    const { bill, entry } = await makeConfirmedBill(10, 1500); // total 15000
    expect(bill.state).toBe("CONFIRMED");
    expect(entry.number).toBe(bill.number);
    const debit = entry.items.find((i) => i.accountId === purchaseExpenseId);
    const credit = entry.items.find((i) => i.accountId === creditorsId);
    expect(debit?.debit.equals(15000)).toBe(true);
    expect(credit?.credit.equals(15000)).toBe(true);
    const totalDebit = entry.items.reduce((a, i) => a.plus(i.debit), money(0));
    const totalCredit = entry.items.reduce((a, i) => a.plus(i.credit), money(0));
    expect(totalDebit.equals(totalCredit)).toBe(true);
  });

  it("full vendor payment posts Dr Creditors / Cr Bank and marks the bill PAID (direction SEND)", async () => {
    const { bill } = await makeConfirmedBill(10, 1500); // 15000
    const { payment, entry, bill: paid } = await registerPayment({ billId: bill.id, method: "BANK", amount: 15000 });
    expect(payment.direction).toBe("SEND"); // derived from the bill, not the client
    const debit = entry.items.find((i) => i.accountId === creditorsId);
    const credit = entry.items.find((i) => i.accountId === bankId);
    expect(debit?.debit.equals(15000)).toBe(true);
    expect(credit?.credit.equals(15000)).toBe(true);
    expect(paid!.paymentStatus).toBe("PAID");
    expect(paid!.amountDue.equals(0)).toBe(true);
  });

  it("partial vendor payment marks PARTIAL then PAID", async () => {
    const { bill } = await makeConfirmedBill(4, 1000); // 4000
    const p1 = await registerPayment({ billId: bill.id, method: "CASH", amount: 1500 });
    expect(p1.bill!.paymentStatus).toBe("PARTIAL");
    expect(p1.bill!.amountDue.equals(2500)).toBe(true);
    const p2 = await registerPayment({ billId: bill.id, method: "BANK", amount: 2500 });
    expect(p2.bill!.paymentStatus).toBe("PAID");
  });

  it("rejects overpaying a bill and writes nothing (rollback)", async () => {
    const { bill } = await makeConfirmedBill(1, 1000); // 1000
    const before = await prisma.paymentAllocation.count({ where: { billId: bill.id } });
    await expect(registerPayment({ billId: bill.id, method: "BANK", amount: 1500 })).rejects.toBeInstanceOf(AppError);
    const after = await prisma.paymentAllocation.count({ where: { billId: bill.id } });
    expect(after).toBe(before);
  });

  it("rejects payment on an unconfirmed bill", async () => {
    const po = await createPurchaseOrder({ vendorId, lines: [{ productId, quantity: 1, unitPrice: 1000 }] });
    await confirmPurchaseOrder(po.id);
    const draft = await createBillFromPurchaseOrder(po.id); // not confirmed
    await expect(registerPayment({ billId: draft.id, method: "BANK", amount: 1000 })).rejects.toBeInstanceOf(AppError);
  });

  it("rejects double-confirming a bill", async () => {
    const po = await createPurchaseOrder({ vendorId, lines: [{ productId, quantity: 1, unitPrice: 1000 }] });
    await confirmPurchaseOrder(po.id);
    const bill = await createBillFromPurchaseOrder(po.id);
    await confirmBill(bill.id);
    await expect(confirmBill(bill.id)).rejects.toBeInstanceOf(AppError);
  });

  it("rejects billing an unconfirmed purchase order", async () => {
    const po = await createPurchaseOrder({ vendorId, lines: [{ productId, quantity: 1, unitPrice: 1000 }] });
    await expect(createBillFromPurchaseOrder(po.id)).rejects.toBeInstanceOf(AppError);
  });

  it("enforces vendor ownership on bill read", async () => {
    const { bill } = await makeConfirmedBill(1, 1000);
    const owner = { role: "CONTACT", contactId: vendorId } as User;
    const stranger = { role: "CONTACT", contactId: crypto.randomUUID() } as User;
    await expect(getBillForUser(bill.id, owner)).resolves.toBeTruthy();
    await expect(getBillForUser(bill.id, stranger)).rejects.toBeInstanceOf(AppError);
  });

  it("rejects a payment targeting both or neither document (service guard)", async () => {
    const { bill } = await makeConfirmedBill(1, 1000);
    await expect(
      registerPayment({ invoiceId: crypto.randomUUID(), billId: bill.id, method: "BANK", amount: 10 } as CreatePaymentInput),
    ).rejects.toBeInstanceOf(AppError);
    await expect(
      registerPayment({ method: "BANK", amount: 10 } as CreatePaymentInput),
    ).rejects.toBeInstanceOf(AppError);
  });
});
