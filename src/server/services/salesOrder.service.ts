import { prisma } from "@/lib/prisma";
import { money, round2 } from "@/lib/money";
import { NotFound, Conflict } from "@/lib/errors";
import { computeLineTotal } from "./sales.calc";
import { nextNumber } from "./numbering.service";
import type { CreateSalesOrderInput } from "@/server/validation/sales";

export async function createSalesOrder(input: CreateSalesOrderInput, userId?: string) {
  const customer = await prisma.contact.findUnique({ where: { id: input.customerId } });
  if (!customer || customer.isArchived) throw NotFound("Customer not found.");

  const productIds = [...new Set(input.lines.map((l) => l.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const found = new Set(products.map((p) => p.id));
  for (const l of input.lines) {
    if (!found.has(l.productId)) throw NotFound(`Product ${l.productId} not found.`);
  }

  return prisma.$transaction(async (tx) => {
    const number = await nextNumber(tx, "SO");
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
    return tx.salesOrder.create({
      data: {
        number,
        customerId: input.customerId,
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

export function listSalesOrders() {
  return prisma.salesOrder.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { customer: true },
  });
}

export async function getSalesOrder(id: string) {
  const so = await prisma.salesOrder.findUnique({
    where: { id },
    include: { customer: true, lines: { include: { product: true } }, invoice: true },
  });
  if (!so) throw NotFound("Sales order not found.");
  return so;
}

export async function confirmSalesOrder(id: string) {
  const so = await prisma.salesOrder.findUnique({ where: { id } });
  if (!so) throw NotFound("Sales order not found.");
  if (so.state !== "DRAFT") throw Conflict("Only a draft sales order can be confirmed.");
  return prisma.salesOrder.update({ where: { id }, data: { state: "CONFIRMED" } });
}

export async function createInvoiceFromSalesOrder(id: string, userId?: string) {
  return prisma.$transaction(async (tx) => {
    const so = await tx.salesOrder.findUnique({ where: { id }, include: { lines: true } });
    if (!so) throw NotFound("Sales order not found.");
    if (so.state !== "CONFIRMED") throw Conflict("Sales order must be confirmed before invoicing.");
    const existing = await tx.customerInvoice.findUnique({ where: { salesOrderId: id } });
    if (existing) throw Conflict("An invoice already exists for this sales order.");

    const salesIncome = await tx.account.findUniqueOrThrow({ where: { name: "Sales Income A/c" } });
    const invoiceDate = new Date();
    const number = await nextNumber(tx, "INV", invoiceDate.getFullYear());
    const total = round2(so.amountTotal);

    return tx.customerInvoice.create({
      data: {
        number,
        customerId: so.customerId,
        salesOrderId: so.id,
        invoiceDate,
        state: "DRAFT",
        paymentStatus: "NOT_PAID",
        amountTotal: total,
        amountPaid: round2(0),
        amountDue: total,
        createdById: userId ?? null,
        lines: {
          create: so.lines.map((l) => ({
            productId: l.productId,
            accountId: salesIncome.id, // default income account per mockup
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
