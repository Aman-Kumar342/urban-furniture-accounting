import { Role, type User } from "@prisma/client";
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

// Self-signup creates an internal ACCOUNTANT. Admins and Contact-portal users are
// provisioned elsewhere (seed / contact creation), never via public signup.
export async function signup(
  input: SignupInput,
  meta?: SessionMeta,
): Promise<{ user: User; token: string }> {
  const existing = await userRepo.findByEmail(input.email);
  if (existing) {
    throw new AuthServiceError("EMAIL_TAKEN", 409, "That email is already registered.");
  }
  const passwordHash = await hashPassword(input.password);
  const user = await userRepo.create({
    name: input.name,
    email: input.email,
    passwordHash,
    role: Role.ACCOUNTANT,
  });
  const { token } = await createSession(user.id, meta);
  return { user, token };
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
