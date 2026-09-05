import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { createAnalyticAccount } from "@/server/services/analyticAccount.service";
import { createBudget, confirmBudget, getBudgetReport } from "@/server/services/budget.service";
import { createContact } from "@/server/services/contact.service";
import { createProduct } from "@/server/services/product.service";
import {
  createPurchaseOrder,
  confirmPurchaseOrder,
  createBillFromPurchaseOrder,
} from "@/server/services/purchaseOrder.service";
import { confirmBill } from "@/server/services/bill.service";
import {
  createSalesOrder,
  confirmSalesOrder,
  createInvoiceFromSalesOrder,
} from "@/server/services/salesOrder.service";
import { confirmInvoice } from "@/server/services/invoice.service";

const ts = Date.now();
const period = { periodStart: new Date("2026-01-01"), periodEnd: new Date("2026-12-31") };
let vendorId: string;
let customerId: string;
let productId: string;
let expAnalytic: string;
let incAnalytic: string;

beforeAll(async () => {
  vendorId = (await createContact({ name: "BR Vend", type: "VENDOR", email: `brv+${ts}@uf.test` })).id;
  customerId = (await createContact({ name: "BR Cust", type: "CUSTOMER", email: `brc+${ts}@uf.test` })).id;
  productId = (await createProduct({ name: "BR Item", type: "GOODS", salesPrice: 2500, cost: 1500 })).id;
  expAnalytic = (await createAnalyticAccount({ name: `Furniture ${ts}`, type: "EXPENSE" })).id;
  incAnalytic = (await createAnalyticAccount({ name: `Showroom ${ts}`, type: "INCOME" })).id;
});
afterAll(async () => { await prisma.$disconnect(); });

async function confirmedPurchase(analyticId: string, qty: number, price: number) {
  const po = await createPurchaseOrder({ vendorId, lines: [{ productId, quantity: qty, unitPrice: price, analyticAccountId: analyticId }] });
  const confirmed = await confirmPurchaseOrder(po.id);
  const bill = await createBillFromPurchaseOrder(po.id);
  const billConf = await confirmBill(bill.id);
  return { poWarnings: confirmed.warnings, billWarnings: billConf.warnings };
}

describe("Budget Report (Option A) + budget warnings", () => {
  it("computes Achieved from confirmed bill/invoice lines tagged to the analytic", async () => {
    const budget = await createBudget({
      name: `BR ${ts}`,
      ...period,
      lines: [
        { analyticAccountId: expAnalytic, committedAmount: 100000 },
        { analyticAccountId: incAnalytic, committedAmount: 50000 },
      ],
    });
    await confirmBudget(budget.id);

    // Expense side: confirmed purchase of 15000 tagged to the expense analytic.
    await confirmedPurchase(expAnalytic, 10, 1500);
    // Income side: confirmed sale of 25000 tagged to the income analytic.
    const so = await createSalesOrder({ customerId, lines: [{ productId, quantity: 10, unitPrice: 2500, analyticAccountId: incAnalytic }] });
    await confirmSalesOrder(so.id);
    const inv = await createInvoiceFromSalesOrder(so.id);
    await confirmInvoice(inv.id);

    const report = await getBudgetReport(budget.id);
    const exp = report.lines.find((l) => l.analyticAccountId === expAnalytic)!;
    const inc = report.lines.find((l) => l.analyticAccountId === incAnalytic)!;
    expect(exp.achieved.equals(15000)).toBe(true);
    expect(exp.amountToAchieve.equals(85000)).toBe(true);
    expect(exp.achievedPct.equals(15)).toBe(true);
    expect(inc.achieved.equals(25000)).toBe(true);
    expect(inc.achievedPct.equals(50)).toBe(true);
    expect(report.totalCommitted.equals(150000)).toBe(true);
    expect(report.totalAchieved.equals(40000)).toBe(true);
  });

  it("emits a non-blocking 'Exceeds Approved Budget' warning on PO confirm", async () => {
    const tight = (await createAnalyticAccount({ name: `Tight ${ts}`, type: "EXPENSE" })).id;
    const budget = await createBudget({ name: `Tight B ${ts}`, ...period, lines: [{ analyticAccountId: tight, committedAmount: 5000 }] });
    await confirmBudget(budget.id);
    const po = await createPurchaseOrder({ vendorId, lines: [{ productId, quantity: 10, unitPrice: 1000, analyticAccountId: tight }] }); // 10000 > 5000
    const confirmed = await confirmPurchaseOrder(po.id);
    expect(confirmed.purchaseOrder.state).toBe("CONFIRMED"); // still confirmed (non-blocking)
    expect(confirmed.warnings.length).toBeGreaterThanOrEqual(1);
  });

  it("emits the warning on Bill confirm too, and no warning when within budget", async () => {
    const tight = (await createAnalyticAccount({ name: `Tight2 ${ts}`, type: "EXPENSE" })).id;
    const budget = await createBudget({ name: `Tight2 B ${ts}`, ...period, lines: [{ analyticAccountId: tight, committedAmount: 1000 }] });
    await confirmBudget(budget.id);
    const over = await confirmedPurchase(tight, 5, 1000); // 5000 > 1000
    expect(over.billWarnings.length).toBeGreaterThanOrEqual(1);

    const roomy = (await createAnalyticAccount({ name: `Roomy ${ts}`, type: "EXPENSE" })).id;
    const budget2 = await createBudget({ name: `Roomy B ${ts}`, ...period, lines: [{ analyticAccountId: roomy, committedAmount: 100000 }] });
    await confirmBudget(budget2.id);
    const within = await confirmedPurchase(roomy, 1, 1000); // 1000 < 100000
    expect(within.poWarnings).toHaveLength(0);
    expect(within.billWarnings).toHaveLength(0);
  });

  it("404s for a missing budget report", async () => {
    await expect(getBudgetReport(crypto.randomUUID())).rejects.toBeInstanceOf(AppError);
  });
});
