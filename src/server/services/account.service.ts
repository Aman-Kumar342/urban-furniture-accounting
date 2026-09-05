import { Prisma } from "@prisma/client";
import { NotFound, Conflict, Unprocessable } from "@/lib/errors";
import { accountRepo } from "@/server/repositories/account.repo";
import type { CreateAccountInput, UpdateAccountInput } from "@/server/validation/account";

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

export async function createAccount(input: CreateAccountInput) {
  if (input.parentId) {
    const parent = await accountRepo.findById(input.parentId);
    if (!parent) throw NotFound("Parent account not found.");
  }
  try {
    return await accountRepo.create({
      code: input.code,
      name: input.name,
      type: input.type,
      parentId: input.parentId ?? null,
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw Conflict("An account with this code or name already exists.");
    throw e;
  }
}

export function listAccounts(includeArchived = false) {
  return accountRepo.list(includeArchived);
}

export async function getAccount(id: string) {
  const account = await accountRepo.findById(id);
  if (!account) throw NotFound("Account not found.");
  return account;
}

export async function updateAccount(id: string, input: UpdateAccountInput) {
  const existing = await accountRepo.findById(id);
  if (!existing) throw NotFound("Account not found.");

  if (input.parentId !== undefined && input.parentId !== null) {
    if (input.parentId === id) {
      throw Unprocessable("INVALID_PARENT", "An account cannot be its own parent.");
    }
    // Walk up the proposed parent chain; reaching this id would create a cycle.
    let cursor = await accountRepo.findById(input.parentId);
    if (!cursor) throw NotFound("Parent account not found.");
    while (cursor?.parentId) {
      if (cursor.parentId === id) {
        throw Unprocessable("INVALID_PARENT", "That parent would create a cycle in the hierarchy.");
      }
      cursor = await accountRepo.findById(cursor.parentId);
    }
  }

  if (input.type && input.type !== existing.type) {
    const postings = await accountRepo.countJournalItems(id);
    if (postings > 0) {
      throw Conflict("Cannot change the type of an account that already has postings.");
    }
  }

  try {
    return await accountRepo.update(id, {
      name: input.name,
      type: input.type,
      parentId: input.parentId,
    });
  } catch (e) {
    if (isUniqueViolation(e)) throw Conflict("An account with this code or name already exists.");
    throw e;
  }
}

// Archive (soft) — never hard-delete accounting history. Guarded against breaking references.
export async function archiveAccount(id: string) {
  const account = await accountRepo.findById(id);
  if (!account) throw NotFound("Account not found.");
  if (await accountRepo.countJournalDefaults(id)) {
    throw Conflict("Cannot archive an account that is a journal's default account.");
  }
  if (await accountRepo.countActiveChildren(id)) {
    throw Conflict("Cannot archive an account that has active child accounts.");
  }
  return accountRepo.update(id, { isArchived: true });
}

export async function unarchiveAccount(id: string) {
  const account = await accountRepo.findById(id);
  if (!account) throw NotFound("Account not found.");
  return accountRepo.update(id, { isArchived: false });
}
