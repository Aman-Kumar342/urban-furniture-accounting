import { Prisma } from "@prisma/client";
import { NotFound, Conflict } from "@/lib/errors";
import { analyticAccountRepo } from "@/server/repositories/analyticAccount.repo";
import type {
  CreateAnalyticAccountInput,
  UpdateAnalyticAccountInput,
} from "@/server/validation/analyticAccount";

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

export async function createAnalyticAccount(input: CreateAnalyticAccountInput) {
  try {
    return await analyticAccountRepo.create({ name: input.name, type: input.type });
  } catch (e) {
    if (isUniqueViolation(e)) throw Conflict("An analytic account with this name already exists.");
    throw e;
  }
}

export function listAnalyticAccounts(includeArchived = false) {
  return analyticAccountRepo.list(includeArchived);
}

export async function getAnalyticAccount(id: string) {
  const a = await analyticAccountRepo.findById(id);
  if (!a) throw NotFound("Analytic account not found.");
  return a;
}

export async function updateAnalyticAccount(id: string, input: UpdateAnalyticAccountInput) {
  const existing = await analyticAccountRepo.findById(id);
  if (!existing) throw NotFound("Analytic account not found.");
  try {
    return await analyticAccountRepo.update(id, { name: input.name, type: input.type });
  } catch (e) {
    if (isUniqueViolation(e)) throw Conflict("An analytic account with this name already exists.");
    throw e;
  }
}

export async function archiveAnalyticAccount(id: string) {
  const existing = await analyticAccountRepo.findById(id);
  if (!existing) throw NotFound("Analytic account not found.");
  return analyticAccountRepo.update(id, { isArchived: true });
}

export async function unarchiveAnalyticAccount(id: string) {
  const existing = await analyticAccountRepo.findById(id);
  if (!existing) throw NotFound("Analytic account not found.");
  return analyticAccountRepo.update(id, { isArchived: false });
}
