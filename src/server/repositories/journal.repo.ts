import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const journalRepo = {
  create: (data: Prisma.JournalUncheckedCreateInput) => prisma.journal.create({ data }),
  findById: (id: string) => prisma.journal.findUnique({ where: { id } }),
  update: (id: string, data: Prisma.JournalUncheckedUpdateInput) =>
    prisma.journal.update({ where: { id }, data }),
  list: () => prisma.journal.findMany({ orderBy: { name: "asc" }, include: { defaultAccount: true } }),
};
