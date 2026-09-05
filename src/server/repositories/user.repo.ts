import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Data-access for users. Route handlers/services never call Prisma for users directly.
export const userRepo = {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },
  create(data: Prisma.UserUncheckedCreateInput) {
    return prisma.user.create({ data });
  },
};
