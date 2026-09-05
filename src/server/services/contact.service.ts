import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Conflict, NotFound } from "@/lib/errors";
import type { CreateContactInput, UpdateContactInput } from "@/server/validation/sales";

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

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

export async function getContact(id: string) {
  const contact = await prisma.contact.findUnique({ where: { id } });
  if (!contact) throw NotFound("Contact not found.");
  return contact;
}

export async function updateContact(id: string, input: UpdateContactInput) {
  const existing = await prisma.contact.findUnique({ where: { id } });
  if (!existing) throw NotFound("Contact not found.");
  try {
    return await prisma.contact.update({ where: { id }, data: input });
  } catch (e) {
    if (isUniqueViolation(e)) throw Conflict("A contact with this email already exists.");
    throw e;
  }
}

export async function archiveContact(id: string) {
  const existing = await prisma.contact.findUnique({ where: { id } });
  if (!existing) throw NotFound("Contact not found.");
  return prisma.contact.update({ where: { id }, data: { isArchived: true } });
}

export async function unarchiveContact(id: string) {
  const existing = await prisma.contact.findUnique({ where: { id } });
  if (!existing) throw NotFound("Contact not found.");
  return prisma.contact.update({ where: { id }, data: { isArchived: false } });
}
