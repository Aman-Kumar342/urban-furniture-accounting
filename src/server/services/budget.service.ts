import { Prisma, type AnalyticType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { round2, sum } from "@/lib/money";
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
    // Responsible is a Contact (per the mockup), not an app user.
    const c = await prisma.contact.findUnique({ where: { id } });
    if (!c) throw NotFound("Responsible contact not found.");
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

// --- Budget Report & budget check (Decision C-4 / Option A) ---
// "Achieved" = sum of CONFIRMED document lines tagged to the analytic within the budget
// period: EXPENSE analytics accrue from vendor bills, INCOME analytics from customer
// invoices. This reads the persisted document lines' analytic tags; it does NOT touch the
// JournalItem/posting architecture.
async function achievedForAnalytic(
  db: Prisma.TransactionClient,
  analyticAccountId: string,
  type: AnalyticType,
  start: Date,
  end: Date,
): Promise<Prisma.Decimal> {
  if (type === "EXPENSE") {
    const r = await db.vendorBillLine.aggregate({
      _sum: { lineTotal: true },
      where: { analyticAccountId, bill: { state: "CONFIRMED", billDate: { gte: start, lte: end } } },
    });
    return round2(r._sum.lineTotal ?? 0);
  }
  const r = await db.invoiceLine.aggregate({
    _sum: { lineTotal: true },
    where: { analyticAccountId, invoice: { state: "CONFIRMED", invoiceDate: { gte: start, lte: end } } },
  });
  return round2(r._sum.lineTotal ?? 0);
}

export async function getBudgetReport(id: string) {
  const budget = await prisma.budget.findUnique({
    where: { id },
    include: { lines: { include: { analyticAccount: true } } },
  });
  if (!budget) throw NotFound("Budget not found.");

  const lines = await Promise.all(
    budget.lines.map(async (l) => {
      const committed = round2(l.committedAmount);
      const achieved = await achievedForAnalytic(prisma, l.analyticAccountId, l.type, budget.periodStart, budget.periodEnd);
      const achievedPct = committed.greaterThan(0) ? round2(achieved.div(committed).times(100)) : round2(0);
      return {
        analyticAccountId: l.analyticAccountId,
        analyticName: l.analyticAccount.name,
        type: l.type,
        committed,
        achieved,
        achievedPct,
        amountToAchieve: round2(committed.minus(achieved)),
      };
    }),
  );

  return {
    budgetId: budget.id,
    name: budget.name,
    state: budget.state,
    periodStart: budget.periodStart,
    periodEnd: budget.periodEnd,
    lines,
    totalCommitted: round2(sum(lines.map((l) => l.committed))),
    totalAchieved: round2(sum(lines.map((l) => l.achieved))),
  };
}

// Non-blocking budget check for PO/Bill confirmation. Returns warnings when a tagged line
// amount exceeds the remaining approved budget (committed - achieved) for an analytic in a
// CONFIRMED budget whose period covers the document date. NEVER blocks confirmation.
export async function checkBudgetWarnings(
  db: Prisma.TransactionClient,
  lines: { analyticAccountId: string | null; lineTotal: Prisma.Decimal | number }[],
  date: Date,
): Promise<string[]> {
  const warnings: string[] = [];
  for (const l of lines) {
    if (!l.analyticAccountId) continue;
    const budgetLine = await db.budgetLine.findFirst({
      where: {
        analyticAccountId: l.analyticAccountId,
        budget: { state: "CONFIRMED", periodStart: { lte: date }, periodEnd: { gte: date } },
      },
      include: { analyticAccount: true, budget: true },
    });
    if (!budgetLine) continue;
    const achieved = await achievedForAnalytic(
      db,
      budgetLine.analyticAccountId,
      budgetLine.type,
      budgetLine.budget.periodStart,
      budgetLine.budget.periodEnd,
    );
    const remaining = round2(budgetLine.committedAmount.minus(achieved));
    const amount = round2(l.lineTotal);
    if (amount.greaterThan(remaining)) {
      warnings.push(
        `Exceeds Approved Budget for "${budgetLine.analyticAccount.name}": remaining ${remaining}, this line adds ${amount}.`,
      );
    }
  }
  return warnings;
}
