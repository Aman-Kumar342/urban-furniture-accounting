import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { createJournal, getJournal, updateJournal, listJournals } from "@/server/services/journal.service";
import { createAccount, archiveAccount } from "@/server/services/account.service";

const ts = Date.now();
let bankAccountId: string;

beforeAll(async () => {
  bankAccountId = (await prisma.account.findUniqueOrThrow({ where: { name: "Bank A/c" } })).id;
});
afterAll(async () => { await prisma.$disconnect(); });

describe("Journals", () => {
  it("creates a journal and rejects a duplicate name", async () => {
    const j = await createJournal({ name: `Misc ${ts}`, type: "MISC", defaultAccountId: bankAccountId });
    expect(j.type).toBe("MISC");
    await expect(
      createJournal({ name: `Misc ${ts}`, type: "MISC", defaultAccountId: bankAccountId }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("rejects a missing or archived default account", async () => {
    await expect(
      createJournal({ name: `J ${ts} a`, type: "MISC", defaultAccountId: crypto.randomUUID() }),
    ).rejects.toBeInstanceOf(AppError);
    const archived = await createAccount({ code: `JT${ts}`, name: `Arch Acct ${ts}`, type: "ASSET" });
    await archiveAccount(archived.id);
    await expect(
      createJournal({ name: `J ${ts} b`, type: "MISC", defaultAccountId: archived.id }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("gets by id, 404s for missing, and lists seeded journals", async () => {
    const j = await createJournal({ name: `Misc ${ts} 2`, type: "MISC", defaultAccountId: bankAccountId });
    expect((await getJournal(j.id)).id).toBe(j.id);
    await expect(getJournal(crypto.randomUUID())).rejects.toBeInstanceOf(AppError);
    expect((await listJournals()).length).toBeGreaterThanOrEqual(5);
  });

  it("updates a journal name", async () => {
    const j = await createJournal({ name: `Misc ${ts} 3`, type: "MISC", defaultAccountId: bankAccountId });
    const updated = await updateJournal(j.id, { name: `Misc ${ts} 3 renamed` });
    expect(updated.name).toBe(`Misc ${ts} 3 renamed`);
  });
});
