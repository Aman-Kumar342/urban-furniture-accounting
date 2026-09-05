import { Role, ContactType, Prisma, type User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { userRepo } from "@/server/repositories/user.repo";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { createSession, destroySession, type SessionMeta } from "@/server/auth/session";
import type { LoginInput, SignupInput } from "@/server/validation/auth";

export class AuthServiceError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "AuthServiceError";
  }
}

// PUBLIC signup creates a CONTACT portal user linked to a Contact (never ADMIN/ACCOUNTANT —
// elevated roles come only from admin "Create User"). The Contact is resolved by email:
// linked if one exists without a portal user, otherwise created as a CUSTOMER. User + Contact
// + session are created atomically in one transaction.
export async function signup(
  input: SignupInput,
  meta?: SessionMeta,
): Promise<{ user: User; token: string }> {
  const existingUser = await userRepo.findByEmail(input.email);
  if (existingUser) {
    throw new AuthServiceError("EMAIL_TAKEN", 409, "That email is already registered.");
  }
  const passwordHash = await hashPassword(input.password);

  try {
    return await prisma.$transaction(async (tx) => {
      const existingContact = await tx.contact.findUnique({
        where: { email: input.email },
        include: { portalUser: true },
      });
      if (existingContact?.portalUser) {
        throw new AuthServiceError("EMAIL_TAKEN", 409, "That email is already registered.");
      }
      const contact =
        existingContact ??
        (await tx.contact.create({
          data: { name: input.name, email: input.email, type: ContactType.CUSTOMER },
        }));

      const user = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash,
          role: Role.CONTACT,
          contactId: contact.id,
        },
      });
      const { token } = await createSession(user.id, meta, tx);
      return { user, token };
    });
  } catch (e) {
    if (e instanceof AuthServiceError) throw e;
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new AuthServiceError("EMAIL_TAKEN", 409, "That email is already registered.");
    }
    throw e;
  }
}

export async function login(
  input: LoginInput,
  meta?: SessionMeta,
): Promise<{ user: User; token: string }> {
  const user = await userRepo.findByEmail(input.email);
  // Same message whether the user is missing, inactive, or the password is wrong
  // (avoids account enumeration).
  const invalid = new AuthServiceError(
    "INVALID_CREDENTIALS",
    401,
    "Invalid email or password.",
  );
  if (!user || !user.isActive) throw invalid;
  const good = await verifyPassword(input.password, user.passwordHash);
  if (!good) throw invalid;

  const { token } = await createSession(user.id, meta);
  return { user, token };
}

export async function logout(token: string): Promise<void> {
  await destroySession(token);
}
