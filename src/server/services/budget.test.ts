import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { createAnalyticAccount } from "@/server/services/analyticAccount.service";
import {
  createBudget,
  getBudget,
  updateBudget,
  confirmBudget,
  reviseBudget,
  cancelBudget,
} from "@/server/services/budget.service";
import { createBudgetSchema } from "@/server/validation/budget";

const ts = Date.now();
let a1: string;
let a2: string;
const period = { periodStart: new Date("2026-01-01"), periodEnd: new Date("2026-03-31") };

beforeAll(async () => {
  a1 = (await createAnalyticAccount({ name: `BA1 ${ts}`, type: "EXPENSE" })).id;
  a2 = (await createAnalyticAccount({ name: `BA2 ${ts}`, type: "INCOME" })).id;
});
afterAll(async () => { await prisma.$disconnect(); });

describe("Budget module", () => {
  it("creates a draft budget with typed lines", async () => {
    const b = await createBudget({
      name: `FY ${ts}`,
      ...period,
      lines: [
        { analyticAccountId: a1, committedAmount: 200000 },
        { analyticAccountId: a2, committedAmount: 100000 },
      ],
    });
    expect(b.state).toBe("DRAFT");
    expect(b.lines).toHaveLength(2);
    expect(b.lines.find((l) => l.analyticAccountId === a1)?.type).toBe("EXPENSE");
  });

  it("rejects duplicate analytic lines and a bad analytic id", async () => {
    await expect(
      createBudget({ name: `Dup ${ts}`, ...period, lines: [
        { analyticAccountId: a1, committedAmount: 1 },
        { analyticAccountId: a1, committedAmount: 2 },
      ] }),
    ).rejects.toBeInstanceOf(AppError);
    await expect(
      createBudget({ name: `Bad ${ts}`, ...period, lines: [{ analyticAccountId: crypto.randomUUID(), committedAmount: 1 }] }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("rejects an invalid period at the schema", () => {
    expect(
      createBudgetSchema.safeParse({
        name: "x",
        periodStart: "2026-03-31",
        periodEnd: "2026-01-01",
        lines: [{ analyticAccountId: a1, committedAmount: 1 }],
      }).success,
    ).toBe(false);
  });

  it("edits a draft, blocks edits after confirm, and runs the revision workflow", async () => {
    const b = await createBudget({ name: `WF ${ts}`, ...period, lines: [{ analyticAccountId: a1, committedAmount: 100 }] });
    const edited = await updateBudget(b.id, { lines: [{ analyticAccountId: a1, committedAmount: 500 }] });
    expect(edited.lines[0].committedAmount.equals(500)).toBe(true);

    const confirmed = await confirmBudget(b.id);
    expect(confirmed.state).toBe("CONFIRMED");
    await expect(updateBudget(b.id, { name: "nope" })).rejects.toBeInstanceOf(AppError);

    const revision = await reviseBudget(b.id);
    expect(revision.state).toBe("DRAFT");
    expect(revision.revisionOfId).toBe(b.id);
    expect(revision.name.endsWith("Revised")).toBe(true);
    expect((await getBudget(b.id)).state).toBe("REVISED");

    // a superseded (revised) budget cannot be cancelled
    await expect(cancelBudget(b.id)).rejects.toBeInstanceOf(AppError);
    // but the new draft revision can be cancelled
    expect((await cancelBudget(revision.id)).state).toBe("CANCELLED");
  });

  it("404s for a missing budget", async () => {
    await expect(getBudget(crypto.randomUUID())).rejects.toBeInstanceOf(AppError);
  });
});
