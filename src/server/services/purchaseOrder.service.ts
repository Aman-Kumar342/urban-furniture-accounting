import { prisma } from "@/lib/prisma";
import { money, round2 } from "@/lib/money";
import { NotFound, Conflict } from "@/lib/errors";
import { computeLineTotal } from "./sales.calc";
import { nextNumber } from "./numbering.service";
import type { CreatePurchaseOrderInput } from "@/server/validation/purchase";

export async function createPurchaseOrder(input: CreatePurchaseOrderInput, userId?: string) {
  const vendor = await prisma.contact.findUnique({ where: { id: input.vendorId } });
  if (!vendor || vendor.isArchived) throw NotFound("Vendor not found.");

  const productIds = [...new Set(input.lines.map((l) => l.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const found = new Set(products.map((p) => p.id));
  for (const l of input.lines) {
    if (!found.has(l.productId)) throw NotFound(`Product ${l.productId} not found.`);
  }

  return prisma.$transaction(async (tx) => {
    const number = await nextNumber(tx, "PO");
    let total = money(0);
    const lines = input.lines.map((l) => {
      const lineTotal = computeLineTotal(l.quantity, l.unitPrice);
      total = total.plus(lineTotal);
      return {
        productId: l.productId,
        quantity: l.quantity,
        unitPrice: round2(l.unitPrice),
        lineTotal,
        analyticAccountId: l.analyticAccountId ?? null,
      };
    });
    return tx.purchaseOrder.create({
      data: {
        number,
        vendorId: input.vendorId,
        orderDate: input.orderDate ?? new Date(),
        state: "DRAFT",
        amountTotal: round2(total),
        createdById: userId ?? null,
        lines: { create: lines },
      },
      include: { lines: true },
    });
  });
}

export function listPurchaseOrders() {
  return prisma.purchaseOrder.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { vendor: true },
  });
}

export async function confirmPurchaseOrder(id: string) {
  const po = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!po) throw NotFound("Purchase order not found.");
  if (po.state !== "DRAFT") throw Conflict("Only a draft purchase order can be confirmed.");
  return prisma.purchaseOrder.update({ where: { id }, data: { state: "CONFIRMED" } });
}

export async function createBillFromPurchaseOrder(id: string, userId?: string) {
  return prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUnique({ where: { id }, include: { lines: true } });
    if (!po) throw NotFound("Purchase order not found.");
    if (po.state !== "CONFIRMED") throw Conflict("Purchase order must be confirmed before billing.");
    const existing = await tx.vendorBill.findUnique({ where: { purchaseOrderId: id } });
    if (existing) throw Conflict("A bill already exists for this purchase order.");

    const purchaseExpense = await tx.account.findUniqueOrThrow({ where: { name: "Purchase Expense A/c" } });
    const billDate = new Date();
    const number = await nextNumber(tx, "BILL", billDate.getFullYear());
    const total = round2(po.amountTotal);

    return tx.vendorBill.create({
      data: {
        number,
        vendorId: po.vendorId,
        purchaseOrderId: po.id,
        billDate,
        state: "DRAFT",
        paymentStatus: "NOT_PAID",
        amountTotal: total,
        amountPaid: round2(0),
        amountDue: total,
        createdById: userId ?? null,
        lines: {
          create: po.lines.map((l) => ({
            productId: l.productId,
            accountId: purchaseExpense.id, // default expense account per mockup
            analyticAccountId: l.analyticAccountId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            lineTotal: l.lineTotal,
          })),
        },
      },
      include: { lines: true },
    });
  });
}
