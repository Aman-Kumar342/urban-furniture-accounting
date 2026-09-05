import { Role, Prisma, type User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { userRepo } from "@/server/repositories/user.repo";
import { hashPassword } from "@/server/auth/password";
import { AuthServiceError, resolvePortalContact } from "@/server/services/auth.service";
import type { CreateUserInput } from "@/server/validation/auth";

// Admin "Create User": mints a user with the chosen role. Authorization (ADMIN-only) is the
// route's job; this assumes an authorized caller. For a CONTACT the customer Contact is
// linked/created in the same transaction (staff roles have no Contact). No session is opened —
// the admin stays signed in as themselves; the new user signs in later with these credentials.
export async function createUserByAdmin(input: CreateUserInput): Promise<User> {
  const existing = await userRepo.findByEmail(input.email);
  if (existing) {
    throw new AuthServiceError("EMAIL_TAKEN", 409, "That email is already registered.");
  }
  const passwordHash = await hashPassword(input.password);

  try {
    return await prisma.$transaction(async (tx) => {
      let contactId: string | null = null;
      if (input.role === Role.CONTACT) {
        const contact = await resolvePortalContact(tx, input.name, input.email);
        contactId = contact.id;
      }
      return tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash,
          role: input.role,
          contactId,
        },
      });
    });
  } catch (e) {
    if (e instanceof AuthServiceError) throw e;
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new AuthServiceError("EMAIL_TAKEN", 409, "That email is already registered.");
    }
    throw e;
  }
}
