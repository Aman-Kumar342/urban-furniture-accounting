import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const analyticAccountRepo = {
  create: (data: Prisma.AnalyticAccountUncheckedCreateInput) =>
    prisma.analyticAccount.create({ data }),
  findById: (id: string) => prisma.analyticAccount.findUnique({ where: { id } }),
  update: (id: string, data: Prisma.AnalyticAccountUncheckedUpdateInput) =>
    prisma.analyticAccount.update({ where: { id }, data }),
  list: (includeArchived: boolean) =>
    prisma.analyticAccount.findMany({
      where: includeArchived ? {} : { isArchived: false },
      orderBy: { name: "asc" },
    }),
};
