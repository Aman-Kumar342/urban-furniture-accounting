import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import {
  createAccount,
  getAccount,
  updateAccount,
  archiveAccount,
  unarchiveAccount,
} from "@/server/services/account.service";
import { postEntry } from "@/server/services/posting.service";

const ts = Date.now();
let miscJournalId: string;
let creditorsId: string;
let salesIncomeId: string;

beforeAll(async () => {
  miscJournalId = (await prisma.journal.findFirstOrThrow({ where: { type: "MISC" } })).id;
  creditorsId = (await prisma.account.findUniqueOrThrow({ where: { name: "Creditors A/c" } })).id;
  salesIncomeId = (await prisma.account.findUniqueOrThrow({ where: { name: "Sales Income A/c" } })).id;
});
afterAll(async () => { await prisma.$disconnect(); });

describe("Chart of Accounts", () => {
  it("creates an account and rejects a duplicate code", async () => {
    const a = await createAccount({ code: `T${ts}1`, name: `Acct ${ts} 1`, type: "EXPENSE" });
    expect(a.type).toBe("EXPENSE");
    await expect(
      createAccount({ code: `T${ts}1`, name: `Other ${ts}`, type: "EXPENSE" }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("rejects a non-existent parent and accepts a valid one", async () => {
    await expect(
      createAccount({ code: `T${ts}2`, name: `Acct ${ts} 2`, type: "ASSET", parentId: crypto.randomUUID() }),
    ).rejects.toBeInstanceOf(AppError);
    const parent = await createAccount({ code: `T${ts}3`, name: `Parent ${ts}`, type: "ASSET" });
    const child = await createAccount({ code: `T${ts}4`, name: `Child ${ts}`, type: "ASSET", parentId: parent.id });
    expect(child.parentId).toBe(parent.id);
  });

  it("rejects self-parent and cycles on update", async () => {
    const a = await createAccount({ code: `T${ts}5`, name: `Cyc A ${ts}`, type: "ASSET" });
    const b = await createAccount({ code: `T${ts}6`, name: `Cyc B ${ts}`, type: "ASSET", parentId: a.id });
    await expect(updateAccount(a.id, { parentId: a.id })).rejects.toBeInstanceOf(AppError);
    await expect(updateAccount(a.id, { parentId: b.id })).rejects.toBeInstanceOf(AppError);
  });

  it("rejects a type change on an account that has postings", async () => {
    const acct = await createAccount({ code: `T${ts}7`, name: `Posted ${ts}`, type: "EXPENSE" });
    await postEntry({
      journalId: miscJournalId,
      date: new Date(),
      sourceType: "MANUAL",
      lines: [
        { accountId: acct.id, debit: 10 },
        { accountId: creditorsId, credit: 10 },
      ],
    });
    await expect(updateAccount(acct.id, { type: "INCOME" })).rejects.toBeInstanceOf(AppError);
  });

  it("prevents archiving a journal-default account", async () => {
    await expect(archiveAccount(salesIncomeId)).rejects.toBeInstanceOf(AppError);
  });

  it("prevents archiving with active children, then archives a leaf", async () => {
    const parent = await createAccount({ code: `T${ts}8`, name: `ArchP ${ts}`, type: "ASSET" });
    const child = await createAccount({ code: `T${ts}9`, name: `ArchC ${ts}`, type: "ASSET", parentId: parent.id });
    await expect(archiveAccount(parent.id)).rejects.toBeInstanceOf(AppError);
    expect((await archiveAccount(child.id)).isArchived).toBe(true);
    expect((await archiveAccount(parent.id)).isArchived).toBe(true);
    expect((await unarchiveAccount(parent.id)).isArchived).toBe(false);
  });

  it("gets by id and 404s for missing", async () => {
    const a = await createAccount({ code: `T${ts}A`, name: `Get ${ts}`, type: "ASSET" });
    expect((await getAccount(a.id)).id).toBe(a.id);
    await expect(getAccount(crypto.randomUUID())).rejects.toBeInstanceOf(AppError);
  });
});
