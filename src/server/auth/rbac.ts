import { Role } from "@prisma/client";
import type { User } from "@prisma/client";
import { readSessionToken } from "./cookies";
import { getUserByToken } from "./session";

export type SafeUser = Pick<User, "id" | "name" | "email" | "role" | "contactId">;

export class AuthError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/** Returns the signed-in user, or null. Never throws. */
export async function getCurrentUser(): Promise<User | null> {
  const token = await readSessionToken();
  if (!token) return null;
  return getUserByToken(token);
}

/** Requires any authenticated user (401 if not). */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("UNAUTHENTICATED", 401, "Authentication required.");
  return user;
}

/** Requires one of the given roles (401 if anonymous, 403 if wrong role). */
export async function requireRole(...roles: Role[]): Promise<User> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    throw new AuthError("FORBIDDEN", 403, "You do not have access to this resource.");
  }
  return user;
}

/** Requires an internal staff user (Admin or Accountant). */
export function requireStaff(): Promise<User> {
  return requireRole(Role.ADMIN, Role.ACCOUNTANT);
}

export function toSafeUser(u: User): SafeUser {
  return { id: u.id, name: u.name, email: u.email, role: u.role, contactId: u.contactId };
}
