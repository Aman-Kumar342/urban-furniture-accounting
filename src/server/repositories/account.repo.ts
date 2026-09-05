import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const accountRepo = {
  create: (data: Prisma.AccountUncheckedCreateInput) => prisma.account.create({ data }),
  findById: (id: string) => prisma.account.findUnique({ where: { id } }),
  update: (id: string, data: Prisma.AccountUncheckedUpdateInput) =>
    prisma.account.update({ where: { id }, data }),
  list: (includeArchived: boolean) =>
    prisma.account.findMany({
      where: includeArchived ? {} : { isArchived: false },
      orderBy: { code: "asc" },
    }),
  countJournalItems: (id: string) => prisma.journalItem.count({ where: { accountId: id } }),
  countActiveChildren: (id: string) =>
    prisma.account.count({ where: { parentId: id, isArchived: false } }),
  countJournalDefaults: (id: string) =>
    prisma.journal.count({ where: { defaultAccountId: id } }),
};
