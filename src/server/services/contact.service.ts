import { prisma } from "@/lib/prisma";
import { Conflict } from "@/lib/errors";
import type { CreateContactInput } from "@/server/validation/sales";

export async function createContact(input: CreateContactInput) {
  if (input.email) {
    const dup = await prisma.contact.findUnique({ where: { email: input.email } });
    if (dup) throw Conflict("A contact with this email already exists.");
  }
  return prisma.contact.create({ data: input });
}

export function listContacts() {
  return prisma.contact.findMany({
    where: { isArchived: false },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}
