import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { round2 } from "@/lib/money";
import { NotFound, Conflict, Unprocessable } from "@/lib/errors";
import type { CreateBudgetInput, UpdateBudgetInput } from "@/server/validation/budget";

// Resolve budget lines: every analytic must exist, no duplicates; line type mirrors the
// analytic account's type; amount is Decimal.
async function resolveLineData(
  tx: Prisma.TransactionClient,
  lines: { analyticAccountId: string; committedAmount: number }[],
) {
  const ids = [...new Set(lines.map((l) => l.analyticAccountId))];
  if (ids.length !== lines.length) {
    throw Unprocessable("DUPLICATE_ANALYTIC", "Each analytic account may appear only once in a budget.");
  }
  const analytics = await tx.analyticAccount.findMany({ where: { id: { in: ids } } });
  const byId = new Map(analytics.map((a) => [a.id, a]));
  return lines.map((l) => {
    const a = byId.get(l.analyticAccountId);
    if (!a) throw NotFound(`Analytic account ${l.analyticAccountId} not found.`);
    return { analyticAccountId: l.analyticAccountId, type: a.type, committedAmount: round2(l.committedAmount) };
  });
}

async function assertResponsibleExists(id?: string | null) {
  if (id) {
    const u = await prisma.user.findUnique({ where: { id } });
    if (!u) throw NotFound("Responsible user not found.");
  }
}

export async function createBudget(input: CreateBudgetInput) {
  await assertResponsibleExists(input.responsibleId);
  return prisma.$transaction(async (tx) => {
    const lineData = await resolveLineData(tx, input.lines);
    return tx.budget.create({
      data: {
        name: input.name,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        responsibleId: input.responsibleId ?? null,
        state: "DRAFT",
        lines: { create: lineData },
      },
      include: { lines: { include: { analyticAccount: true } } },
    });
  });
}

export function listBudgets() {
  return prisma.budget.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { lines: true, revisionOf: true },
  });
}

export async function getBudget(id: string) {
  const budget = await prisma.budget.findUnique({
    where: { id },
    include: { lines: { include: { analyticAccount: true } }, revisionOf: true, revisions: true },
  });
  if (!budget) throw NotFound("Budget not found.");
  return budget;
}

export async function updateBudget(id: string, input: UpdateBudgetInput) {
  const existing = await prisma.budget.findUnique({ where: { id } });
  if (!existing) throw NotFound("Budget not found.");
  if (existing.state !== "DRAFT") {
    throw Conflict("Only a draft budget can be edited. Revise a confirmed budget instead.");
  }
  const start = input.periodStart ?? existing.periodStart;
  const end = input.periodEnd ?? existing.periodEnd;
  if (end < start) throw Unprocessable("INVALID_PERIOD", "periodEnd must be on or after periodStart.");
  await assertResponsibleExists(input.responsibleId ?? undefined);

  return prisma.$transaction(async (tx) => {
    if (input.lines) {
      const lineData = await resolveLineData(tx, input.lines);
      await tx.budgetLine.deleteMany({ where: { budgetId: id } });
      await tx.budgetLine.createMany({ data: lineData.map((l) => ({ ...l, budgetId: id })) });
    }
    return tx.budget.update({
      where: { id },
      data: {
        name: input.name,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        responsibleId: input.responsibleId,
      },
      include: { lines: { include: { analyticAccount: true } } },
    });
  });
}

export async function confirmBudget(id: string) {
  const b = await prisma.budget.findUnique({ where: { id } });
  if (!b) throw NotFound("Budget not found.");
  if (b.state !== "DRAFT") throw Conflict("Only a draft budget can be confirmed.");
  return prisma.budget.update({ where: { id }, data: { state: "CONFIRMED" } });
}

// Revise: create a new DRAFT revision (name + "Revised", copied lines) and mark the
// original as REVISED. Historical revisions are preserved via revisionOfId.
export async function reviseBudget(id: string) {
  return prisma.$transaction(async (tx) => {
    const original = await tx.budget.findUnique({ where: { id }, include: { lines: true } });
    if (!original) throw NotFound("Budget not found.");
    if (original.state !== "CONFIRMED") throw Conflict("Only a confirmed budget can be revised.");
    const revised = await tx.budget.create({
      data: {
        name: original.name.endsWith("Revised") ? original.name : `${original.name} Revised`,
        periodStart: original.periodStart,
        periodEnd: original.periodEnd,
        responsibleId: original.responsibleId,
        state: "DRAFT",
        revisionOfId: original.id,
        lines: {
          create: original.lines.map((l) => ({
            analyticAccountId: l.analyticAccountId,
            type: l.type,
            committedAmount: l.committedAmount,
          })),
        },
      },
      include: { lines: true },
    });
    await tx.budget.update({ where: { id: original.id }, data: { state: "REVISED" } });
    return revised;
  });
}

export async function cancelBudget(id: string) {
  const b = await prisma.budget.findUnique({ where: { id } });
  if (!b) throw NotFound("Budget not found.");
  if (b.state === "CANCELLED") throw Conflict("Budget is already cancelled.");
  if (b.state === "REVISED") throw Conflict("A superseded (revised) budget cannot be cancelled.");
  return prisma.budget.update({ where: { id }, data: { state: "CANCELLED" } });
}
