import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/lib/errors";
import { PostingError } from "@/server/services/posting.service";
import {
  createManualJournalEntry,
  getJournalEntry,
} from "@/server/services/journalEntry.service";

let miscJournalId: string;
let bankId: string;
let capitalId: string;

beforeAll(async () => {
  miscJournalId = (await prisma.journal.findFirstOrThrow({ where: { type: "MISC" } })).id;
  bankId = (await prisma.account.findUniqueOrThrow({ where: { name: "Bank A/c" } })).id;
  capitalId = (await prisma.account.findUniqueOrThrow({ where: { name: "Capital A/c" } })).id;
});
afterAll(async () => { await prisma.$disconnect(); });

const balanced = () => ({
  journalId: miscJournalId,
  date: new Date(),
  reference: "manual-test",
  lines: [
    { accountId: bankId, debit: 100 },
    { accountId: capitalId, credit: 100 },
  ],
});

describe("Manual Journal Entries", () => {
  it("posts a balanced manual entry via postEntry()", async () => {
    const entry = await createManualJournalEntry(balanced());
    expect(entry.state).toBe("POSTED");
    expect(entry.items).toHaveLength(2);
    expect(entry.number).toMatch(/^JE\/\d{4}\/\d{4}$/);
  });

  it("rejects an unbalanced manual entry", async () => {
    await expect(
      createManualJournalEntry({
        ...balanced(),
        lines: [
          { accountId: bankId, debit: 100 },
          { accountId: capitalId, credit: 90 },
        ],
      }),
    ).rejects.toBeInstanceOf(PostingError);
  });

  it("rejects a missing journal", async () => {
    await expect(
      createManualJournalEntry({ ...balanced(), journalId: crypto.randomUUID() }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("gets an entry by id and 404s for missing", async () => {
    const entry = await createManualJournalEntry(balanced());
    expect((await getJournalEntry(entry.id)).id).toBe(entry.id);
    await expect(getJournalEntry(crypto.randomUUID())).rejects.toBeInstanceOf(AppError);
  });
});
