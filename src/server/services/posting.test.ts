import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { postEntry, PostingError, type PostEntryInput } from "@/server/services/posting.service";

// Integration test against the local dev DB (requires seed: journals + accounts).
let miscJournalId: string;
let bankId: string;
let capitalId: string;
const created: string[] = [];

function balanced(): PostEntryInput {
  return {
    journalId: miscJournalId,
    date: new Date(),
    sourceType: "MANUAL",
    lines: [
      { accountId: bankId, debit: 500 },
      { accountId: capitalId, credit: 500 },
    ],
  };
}

beforeAll(async () => {
  miscJournalId = (await prisma.journal.findFirstOrThrow({ where: { name: "Miscellaneous" } })).id;
  bankId = (await prisma.account.findUniqueOrThrow({ where: { name: "Bank A/c" } })).id;
  capitalId = (await prisma.account.findUniqueOrThrow({ where: { name: "Capital A/c" } })).id;
});

afterAll(async () => {
  for (const id of created) {
    await prisma.journalEntry.update({ where: { id }, data: { state: "CANCELLED" } }).catch(() => {});
    await prisma.journalItem.deleteMany({ where: { entryId: id } }).catch(() => {});
    await prisma.journalEntry.delete({ where: { id } }).catch(() => {});
  }
  await prisma.$disconnect();
});

describe("postEntry (integration)", () => {
  it("posts a balanced entry with an allocated number", async () => {
    const entry = await postEntry(balanced());
    created.push(entry.id);
    expect(entry.state).toBe("POSTED");
    expect(entry.items).toHaveLength(2);
    expect(entry.amount.equals(500)).toBe(true);
    expect(entry.number).toMatch(/^JE\/\d{4}\/\d{4}$/);
  });

  it("rejects an unbalanced entry (before touching the DB)", async () => {
    await expect(
      postEntry({
        ...balanced(),
        lines: [
          { accountId: bankId, debit: 500 },
          { accountId: capitalId, credit: 400 },
        ],
      }),
    ).rejects.toBeInstanceOf(PostingError);
  });

  it("blocks a DIRECT posted insert at the DB (single enforcement path)", async () => {
    await expect(
      prisma.journalEntry.create({
        data: {
          number: `DIRECT/${Date.now()}`,
          journalId: miscJournalId,
          date: new Date(),
          sourceType: "MANUAL",
          state: "POSTED",
          amount: 0,
        },
      }),
    ).rejects.toThrow();
  });

  it("makes a posted entry's items immutable", async () => {
    const entry = await postEntry(balanced());
    created.push(entry.id);
    await expect(
      prisma.journalItem.update({ where: { id: entry.items[0].id }, data: { debit: 1 } }),
    ).rejects.toThrow();
  });

  it("gives concurrent posts distinct numbers", async () => {
    const [a, b] = await Promise.all([postEntry(balanced()), postEntry(balanced())]);
    created.push(a.id, b.id);
    expect(a.number).not.toEqual(b.number);
  });
});
