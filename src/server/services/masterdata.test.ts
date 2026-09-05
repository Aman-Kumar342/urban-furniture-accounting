import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import {
  createAnalyticAccount,
  getAnalyticAccount,
  archiveAnalyticAccount,
  unarchiveAnalyticAccount,
} from "@/server/services/analyticAccount.service";
import {
  createContact,
  getContact,
  updateContact,
  archiveContact,
  unarchiveContact,
} from "@/server/services/contact.service";
import { createProduct, getProduct, updateProduct, archiveProduct } from "@/server/services/product.service";
import { createSalesOrder, getSalesOrder, confirmSalesOrder, createInvoiceFromSalesOrder } from "@/server/services/salesOrder.service";
import { createPurchaseOrder, getPurchaseOrder } from "@/server/services/purchaseOrder.service";
import { confirmInvoice } from "@/server/services/invoice.service";
import { registerPayment, getPaymentForUser } from "@/server/services/payment.service";
import { getDashboard } from "@/server/services/dashboard.service";

const ts = Date.now();
let customerId: string;
let productId: string;

beforeAll(async () => {
  customerId = (await createContact({ name: "MD Cust", type: "CUSTOMER", email: `md+${ts}@uf.test` })).id;
  productId = (await createProduct({ name: "MD Item", type: "GOODS", salesPrice: 2500, cost: 1500 })).id;
});
afterAll(async () => { await prisma.$disconnect(); });

describe("Analytic accounts", () => {
  it("creates, rejects duplicate, gets, archives", async () => {
    const a = await createAnalyticAccount({ name: `Proj ${ts}`, type: "EXPENSE" });
    await expect(createAnalyticAccount({ name: `Proj ${ts}`, type: "EXPENSE" })).rejects.toBeInstanceOf(AppError);
    expect((await getAnalyticAccount(a.id)).id).toBe(a.id);
    expect((await archiveAnalyticAccount(a.id)).isArchived).toBe(true);
    expect((await unarchiveAnalyticAccount(a.id)).isArchived).toBe(false);
    await expect(getAnalyticAccount(crypto.randomUUID())).rejects.toBeInstanceOf(AppError);
  });
});

describe("Contact & Product detail/update/archive", () => {
  it("gets, updates, and archives a contact (no hard delete)", async () => {
    expect((await getContact(customerId)).id).toBe(customerId);
    const updated = await updateContact(customerId, { phone: "9999999999" });
    expect(updated.phone).toBe("9999999999");
    expect((await archiveContact(customerId)).isArchived).toBe(true);
    await unarchiveContact(customerId);
    await expect(getContact(crypto.randomUUID())).rejects.toBeInstanceOf(AppError);
  });

  it("gets, updates, and archives a product", async () => {
    const p = await createProduct({ name: `P ${ts}`, type: "GOODS", salesPrice: 100, cost: 60 });
    expect((await getProduct(p.id)).id).toBe(p.id);
    const updated = await updateProduct(p.id, { salesPrice: 150 });
    expect(updated.salesPrice.equals(150)).toBe(true);
    expect((await archiveProduct(p.id)).isArchived).toBe(true);
  });
});

describe("Document detail", () => {
  it("returns SO and PO by id with lines, 404 for missing", async () => {
    const so = await createSalesOrder({ customerId, lines: [{ productId, quantity: 2, unitPrice: 2500 }] });
    expect((await getSalesOrder(so.id)).lines).toHaveLength(1);
    const po = await createPurchaseOrder({ vendorId: customerId, lines: [{ productId, quantity: 2, unitPrice: 1500 }] });
    expect((await getPurchaseOrder(po.id)).lines).toHaveLength(1);
    await expect(getSalesOrder(crypto.randomUUID())).rejects.toBeInstanceOf(AppError);
  });
});

describe("Payment ownership", () => {
  it("lets the owning Contact read a payment but blocks a stranger", async () => {
    const so = await createSalesOrder({ customerId, lines: [{ productId, quantity: 1, unitPrice: 1000 }] });
    await confirmSalesOrder(so.id);
    const inv = await createInvoiceFromSalesOrder(so.id);
    await confirmInvoice(inv.id);
    const { payment } = await registerPayment({ invoiceId: inv.id, method: "BANK", amount: 1000 });

    const owner = { role: "CONTACT", contactId: customerId } as User;
    const stranger = { role: "CONTACT", contactId: crypto.randomUUID() } as User;
    expect((await getPaymentForUser(payment.id, owner)).id).toBe(payment.id);
    await expect(getPaymentForUser(payment.id, stranger)).rejects.toBeInstanceOf(AppError);
  });
});

describe("Dashboard", () => {
  it("returns real Sales/Purchase counts and null budget (not fabricated)", async () => {
    const d = await getDashboard();
    expect(d.sales.all).toBeGreaterThanOrEqual(d.sales.confirmed);
    expect(typeof d.purchase.all).toBe("number");
    expect(d.budget).toBeNull();
  });
});
