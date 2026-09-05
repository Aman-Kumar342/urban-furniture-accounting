import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/money";
import { getProfitAndLoss, getBalanceSheet, type BalanceSheet } from "@/server/services/report.service";
import { postEntry } from "@/server/services/posting.service";
import { createContact } from "@/server/services/contact.service";
import { createProduct } from "@/server/services/product.service";
import { createSalesOrder, confirmSalesOrder, createInvoiceFromSalesOrder } from "@/server/services/salesOrder.service";
import { confirmInvoice } from "@/server/services/invoice.service";
import { createPurchaseOrder, confirmPurchaseOrder, createBillFromPurchaseOrder } from "@/server/services/purchaseOrder.service";
import { confirmBill } from "@/server/services/bill.service";
import { registerPayment } from "@/server/services/payment.service";

// Reports are read-only projections of the POSTED ledger. Because the dev DB accumulates
// data across runs, these tests assert DELTAS (before vs after) — robust and deterministic.
const YEAR = new Date().getFullYear();

let customerId: string;
let vendorId: string;
let productId: string;
let purchaseJournalId: string;

const assetBal = (bs: BalanceSheet, name: string): Prisma.Decimal =>
  bs.assets.find((a) => a.name === name)?.balance ?? money(0);

async function fullSale(qty: number, price: number) {
  const so = await createSalesOrder({ customerId, lines: [{ productId, quantity: qty, unitPrice: price }] });
  await confirmSalesOrder(so.id);
  const inv = await createInvoiceFromSalesOrder(so.id);
  await confirmInvoice(inv.id);
  await registerPayment({ invoiceId: inv.id, method: "BANK", amount: qty * price });
}

async function fullPurchase(qty: number, price: number) {
  const po = await createPurchaseOrder({ vendorId, lines: [{ productId, quantity: qty, unitPrice: price }] });
  await confirmPurchaseOrder(po.id);
  const bill = await createBillFromPurchaseOrder(po.id);
  await confirmBill(bill.id);
  await registerPayment({ billId: bill.id, method: "BANK", amount: qty * price });
}

beforeAll(async () => {
  customerId = (await createContact({ name: "Rep Cust", type: "CUSTOMER", email: `rc+${Date.now()}@uf.test` })).id;
  vendorId = (await createContact({ name: "Rep Vend", type: "VENDOR", email: `rv+${Date.now()}@uf.test` })).id;
  productId = (await createProduct({ name: "Rep Item", type: "GOODS", salesPrice: 2500, cost: 1500 })).id;
  purchaseJournalId = (await prisma.journal.findFirstOrThrow({ where: { type: "PURCHASE" } })).id;
});
afterAll(async () => { await prisma.$disconnect(); });

describe("Financial reports", () => {
  it("balance sheet always balances (Assets = Liabilities + Capital + Current Year Earnings)", async () => {
    const bs = await getBalanceSheet(YEAR);
    expect(bs.difference.isZero()).toBe(true);
    expect(bs.balanced).toBe(true);
  });

  it("empty period returns zeros and a balanced sheet", async () => {
    const pl = await getProfitAndLoss(2001);
    expect(pl.totalIncome.isZero()).toBe(true);
    expect(pl.totalExpenses.isZero()).toBe(true);
    expect(pl.netIncome.isZero()).toBe(true);
    const bs = await getBalanceSheet(2001);
    expect(bs.totalAssets.isZero()).toBe(true);
    expect(bs.balanced).toBe(true);
  });

  it("a sale increases Income + Bank, clears Debtors, moves net income, stays balanced", async () => {
    const pl0 = await getProfitAndLoss(YEAR);
    const bs0 = await getBalanceSheet(YEAR);
    await fullSale(10, 2500); // 25000
    const pl1 = await getProfitAndLoss(YEAR);
    const bs1 = await getBalanceSheet(YEAR);
    expect(pl1.totalIncome.minus(pl0.totalIncome).equals(25000)).toBe(true);
    expect(pl1.netIncome.minus(pl0.netIncome).equals(25000)).toBe(true);
    expect(assetBal(bs1, "Bank A/c").minus(assetBal(bs0, "Bank A/c")).equals(25000)).toBe(true);
    expect(assetBal(bs1, "Debtors A/c").minus(assetBal(bs0, "Debtors A/c")).equals(0)).toBe(true);
    expect(bs1.balanced).toBe(true);
  });

  it("a purchase increases Expenses, reduces Bank, moves net income, stays balanced", async () => {
    const pl0 = await getProfitAndLoss(YEAR);
    const bs0 = await getBalanceSheet(YEAR);
    await fullPurchase(10, 1500); // 15000
    const pl1 = await getProfitAndLoss(YEAR);
    const bs1 = await getBalanceSheet(YEAR);
    expect(pl1.totalExpenses.minus(pl0.totalExpenses).equals(15000)).toBe(true);
    expect(pl1.netIncome.minus(pl0.netIncome).equals(-15000)).toBe(true);
    expect(assetBal(bs1, "Bank A/c").minus(assetBal(bs0, "Bank A/c")).equals(-15000)).toBe(true);
    expect(bs1.balanced).toBe(true);
  });

  it("excludes draft (unposted) invoices", async () => {
    const pl0 = await getProfitAndLoss(YEAR);
    const so = await createSalesOrder({ customerId, lines: [{ productId, quantity: 1, unitPrice: 1000 }] });
    await confirmSalesOrder(so.id);
    await createInvoiceFromSalesOrder(so.id); // draft, not confirmed -> no journal entry
    const pl1 = await getProfitAndLoss(YEAR);
    expect(pl1.totalIncome.equals(pl0.totalIncome)).toBe(true);
  });

  it("filters by year", async () => {
    const other = 2099;
    const other0 = await getProfitAndLoss(other);
    const cur0 = await getProfitAndLoss(YEAR);
    const expenseAcct = await prisma.account.findUniqueOrThrow({ where: { name: "Purchase Expense A/c" } });
    const creditorsAcct = await prisma.account.findUniqueOrThrow({ where: { name: "Creditors A/c" } });
    await postEntry({
      journalId: purchaseJournalId,
      date: new Date(Date.UTC(other, 5, 15)),
      sourceType: "MANUAL",
      lines: [
        { accountId: expenseAcct.id, debit: 100 },
        { accountId: creditorsAcct.id, credit: 100 },
      ],
    });
    const other1 = await getProfitAndLoss(other);
    const cur1 = await getProfitAndLoss(YEAR);
    expect(other1.totalExpenses.minus(other0.totalExpenses).equals(100)).toBe(true);
    expect(cur1.totalExpenses.equals(cur0.totalExpenses)).toBe(true);
  });
});
