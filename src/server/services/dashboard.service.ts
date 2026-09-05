import { prisma } from "@/lib/prisma";

// Read-only dashboard counts derived strictly from the database. Budget metrics are NOT
// fabricated — the Budget module is not implemented yet, so `budget` is null.
export async function getDashboard() {
  const [salesAll, salesConfirmed, salesDraft, purchaseAll, purchaseConfirmed, purchaseDraft] =
    await Promise.all([
      prisma.salesOrder.count(),
      prisma.salesOrder.count({ where: { state: "CONFIRMED" } }),
      prisma.salesOrder.count({ where: { state: "DRAFT" } }),
      prisma.purchaseOrder.count(),
      prisma.purchaseOrder.count({ where: { state: "CONFIRMED" } }),
      prisma.purchaseOrder.count({ where: { state: "DRAFT" } }),
    ]);

  return {
    sales: { all: salesAll, confirmed: salesConfirmed, draft: salesDraft },
    purchase: { all: purchaseAll, confirmed: purchaseConfirmed, draft: purchaseDraft },
    budget: null, // not implemented yet — do not fabricate
  };
}
