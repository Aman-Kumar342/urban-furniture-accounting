import { prisma } from "@/lib/prisma";
import { NotFound } from "@/lib/errors";
import { postEntry } from "@/server/services/posting.service";
import type { CreateManualJournalEntryInput } from "@/server/validation/journalEntry";

// Manual journal entry. Validates references, then delegates ALL accounting to postEntry()
// (the only sanctioned posting path — balance check, numbering, DRAFT->POSTED transition).
export async function createManualJournalEntry(
  input: CreateManualJournalEntryInput,
  userId?: string,
) {
  const journal = await prisma.journal.findUnique({ where: { id: input.journalId } });
  if (!journal) throw NotFound("Journal not found.");

  const accountIds = [...new Set(input.lines.map((l) => l.accountId))];
  if ((await prisma.account.count({ where: { id: { in: accountIds } } })) !== accountIds.length) {
    throw NotFound("One or more accounts not found.");
  }

  const partnerIds = [
    ...new Set([input.partnerId, ...input.lines.map((l) => l.partnerId)].filter(Boolean) as string[]),
  ];
  if (partnerIds.length && (await prisma.contact.count({ where: { id: { in: partnerIds } } })) !== partnerIds.length) {
    throw NotFound("One or more partners not found.");
  }

  const analyticIds = [...new Set(input.lines.map((l) => l.analyticAccountId).filter(Boolean) as string[])];
  if (analyticIds.length && (await prisma.analyticAccount.count({ where: { id: { in: analyticIds } } })) !== analyticIds.length) {
    throw NotFound("One or more analytic accounts not found.");
  }

  return postEntry({
    journalId: input.journalId,
    date: input.date,
    sourceType: "MANUAL",
    reference: input.reference ?? null,
    partnerId: input.partnerId ?? null,
    createdById: userId ?? null,
    numberKey: "JE",
    lines: input.lines.map((l) => ({
      accountId: l.accountId,
      debit: l.debit ?? 0,
      credit: l.credit ?? 0,
      partnerId: l.partnerId ?? null,
      analyticAccountId: l.analyticAccountId ?? null,
      label: l.label ?? null,
    })),
  });
}

export function listJournalEntries() {
  return prisma.journalEntry.findMany({
    orderBy: { date: "desc" },
    take: 100,
    include: { journal: true, partner: true },
  });
}

export async function getJournalEntry(id: string) {
  const entry = await prisma.journalEntry.findUnique({
    where: { id },
    include: {
      journal: true,
      partner: true,
      items: { include: { account: true, partner: true, analyticAccount: true } },
    },
  });
  if (!entry) throw NotFound("Journal entry not found.");
  return entry;
}
