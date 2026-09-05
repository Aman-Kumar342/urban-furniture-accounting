import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NotFound, Conflict } from "@/lib/errors";
import { journalRepo } from "@/server/repositories/journal.repo";
import type { CreateJournalInput, UpdateJournalInput } from "@/server/validation/journal";

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

async function assertDefaultAccountUsable(accountId: string) {
  const account = await prisma.account.findUnique({ where: { id: accountId } });
  if (!account) throw NotFound("Default account not found.");
  if (account.isArchived) throw Conflict("Default account is archived.");
}

export async function createJournal(input: CreateJournalInput) {
  await assertDefaultAccountUsable(input.defaultAccountId);
  try {
    return await journalRepo.create({
      name: input.name,
      type: input.type,
      defaultAccountId: input.defaultAccountId,
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw Conflict("A journal with this name already exists.");
    throw e;
  }
}

export function listJournals() {
  return journalRepo.list();
}

export async function getJournal(id: string) {
  const journal = await journalRepo.findById(id);
  if (!journal) throw NotFound("Journal not found.");
  return journal;
}

export async function updateJournal(id: string, input: UpdateJournalInput) {
  const existing = await journalRepo.findById(id);
  if (!existing) throw NotFound("Journal not found.");
  if (input.defaultAccountId) await assertDefaultAccountUsable(input.defaultAccountId);
  try {
    return await journalRepo.update(id, {
      name: input.name,
      type: input.type,
      defaultAccountId: input.defaultAccountId,
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw Conflict("A journal with this name already exists.");
    throw e;
  }
}
