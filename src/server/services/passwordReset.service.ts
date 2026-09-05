import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/server/auth/password";
import { deliverPasswordReset } from "@/server/mail/mailer";

// One-time, hashed, time-limited password reset tokens.
const RESET_TTL_MS = 1000 * 60 * 60; // 1 hour

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export class PasswordResetError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "PasswordResetError";
  }
}

// One deliberately generic failure for invalid / expired / already-used tokens, so a caller can
// never tell which case they hit.
const invalidToken = () =>
  new PasswordResetError("INVALID_RESET_TOKEN", 400, "This reset link is invalid or has expired.");

// Requests a reset for `email`. Callers MUST respond identically whether or not a user was found
// (no account enumeration). On a hit: supersede the user's earlier unused tokens, mint a new one,
// store only its hash, and hand the link to the mailer. Returns the raw reset URL ONLY so the
// route can surface it in development; the route must never expose it in production.
export async function requestPasswordReset(
  email: string,
  origin: string,
): Promise<{ matched: boolean; resetUrl?: string }> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return { matched: false };

  const rawToken = crypto.randomBytes(32).toString("base64url");
  const tokenHash = sha256(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await prisma.$transaction(async (tx) => {
    // A new request invalidates the user's earlier unused tokens.
    await tx.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    await tx.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } });
  });

  const resetUrl = `${origin}/reset-password?token=${rawToken}`;
  await deliverPasswordReset({ to: user.email, resetUrl });
  return { matched: true, resetUrl };
}

// Consumes a reset token and sets a new password. Atomically: marks the token used, updates the
// password, invalidates ALL of the user's sessions, and drops the user's other reset tokens.
// Rejects invalid / expired / already-used tokens with one generic error.
export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const tokenHash = sha256(rawToken);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record) throw invalidToken();
  if (record.usedAt) throw invalidToken();
  if (record.expiresAt.getTime() < Date.now()) throw invalidToken();

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction(async (tx) => {
    // Guard against a concurrent double-use: only proceed if still unused.
    const consumed = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (consumed.count === 0) throw invalidToken();

    await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
    // Invalidate every existing session so old logins can't continue after a reset.
    await tx.session.deleteMany({ where: { userId: record.userId } });
    // Drop any other outstanding reset tokens for this user.
    await tx.passwordResetToken.deleteMany({
      where: { userId: record.userId, id: { not: record.id } },
    });
  });
}
