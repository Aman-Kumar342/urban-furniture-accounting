import { describe, it, expect, afterAll } from "vitest";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import {
  requestPasswordReset,
  resetPassword,
  PasswordResetError,
} from "@/server/services/passwordReset.service";
import { createUserByAdmin } from "@/server/services/admin.service";
import { login, AuthServiceError } from "@/server/services/auth.service";
import { createSession, getUserByToken } from "@/server/auth/session";
import { resetPasswordSchema } from "@/server/validation/auth";

const ts = Date.now();
const ORIGIN = "http://localhost:3100";
const OLD_PW = "Passw0rd!";
const NEW_PW = "N3wPass!x"; // 9 chars: upper N/P, lower w/a/s/s/x, digit 3, special !
const sha256 = (v: string) => crypto.createHash("sha256").update(v).digest("hex");

afterAll(async () => {
  await prisma.$disconnect();
});

async function makeUser(tag: string) {
  const email = `pr_${tag}_${ts}@uf.test`;
  const user = await createUserByAdmin({ name: tag, email, role: "ACCOUNTANT", password: OLD_PW });
  return { user, email };
}
const tokenOf = (url: string) => new URL(url).searchParams.get("token")!;

describe("request password reset", () => {
  it("returns a reset link for an existing account", async () => {
    const { email } = await makeUser("exists");
    const res = await requestPasswordReset(email, ORIGIN);
    expect(res.matched).toBe(true);
    expect(res.resetUrl).toContain("/reset-password?token=");
  });

  it("does not reveal a non-existent account (no token, no throw)", async () => {
    const res = await requestPasswordReset(`nobody_${ts}@uf.test`, ORIGIN);
    expect(res.matched).toBe(false);
    expect(res.resetUrl).toBeUndefined();
  });

  it("stores only the hash of the token, never the raw value", async () => {
    const { user, email } = await makeUser("hashed");
    const res = await requestPasswordReset(email, ORIGIN);
    const raw = tokenOf(res.resetUrl!);
    const row = await prisma.passwordResetToken.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    expect(row?.tokenHash).toBe(sha256(raw));
    expect(row?.tokenHash).not.toBe(raw);
  });

  it("supersedes a user's earlier unused token on a new request", async () => {
    const { user, email } = await makeUser("dup");
    const first = tokenOf((await requestPasswordReset(email, ORIGIN)).resetUrl!);
    const second = tokenOf((await requestPasswordReset(email, ORIGIN)).resetUrl!);

    // Only the latest token survives.
    const rows = await prisma.passwordResetToken.findMany({ where: { userId: user.id, usedAt: null } });
    expect(rows).toHaveLength(1);

    await expect(resetPassword(first, NEW_PW)).rejects.toBeInstanceOf(PasswordResetError);
    await resetPassword(second, NEW_PW);
    expect((await login({ email, password: NEW_PW })).user.id).toBe(user.id);
  });
});

describe("reset password", () => {
  it("resets the password, invalidates sessions, and consumes the token", async () => {
    const { user, email } = await makeUser("reset");
    const { token: sessionToken } = await createSession(user.id);
    expect((await getUserByToken(sessionToken))?.id).toBe(user.id);

    const raw = tokenOf((await requestPasswordReset(email, ORIGIN)).resetUrl!);
    await resetPassword(raw, NEW_PW);

    // Sessions invalidated.
    expect(await getUserByToken(sessionToken)).toBeNull();
    // New password works, old one doesn't.
    expect((await login({ email, password: NEW_PW })).user.id).toBe(user.id);
    await expect(login({ email, password: OLD_PW })).rejects.toBeInstanceOf(AuthServiceError);
    // Token can't be reused.
    await expect(resetPassword(raw, NEW_PW)).rejects.toMatchObject({ code: "INVALID_RESET_TOKEN", status: 400 });
  });

  it("rejects an expired token", async () => {
    const { user } = await makeUser("expired");
    const raw = crypto.randomBytes(32).toString("base64url");
    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash: sha256(raw), expiresAt: new Date(Date.now() - 1000) },
    });
    await expect(resetPassword(raw, NEW_PW)).rejects.toMatchObject({ code: "INVALID_RESET_TOKEN" });
  });

  it("rejects an already-used token", async () => {
    const { user } = await makeUser("used");
    const raw = crypto.randomBytes(32).toString("base64url");
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(raw),
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: new Date(),
      },
    });
    await expect(resetPassword(raw, NEW_PW)).rejects.toBeInstanceOf(PasswordResetError);
  });

  it("rejects an unknown/garbage token", async () => {
    await expect(resetPassword("this-token-does-not-exist-000", NEW_PW)).rejects.toBeInstanceOf(
      PasswordResetError,
    );
  });
});

describe("reset password schema (shared policy)", () => {
  const accepts = (o: unknown) => resetPasswordSchema.safeParse(o).success;
  const token = "a".repeat(24);
  it("accepts a strong password with a token", () => {
    expect(accepts({ token, password: "Passw0rd!" })).toBe(true);
  });
  it("rejects a weak password", () => {
    expect(accepts({ token, password: "passw0rd!" })).toBe(false); // no uppercase
    expect(accepts({ token, password: "Passw0r!" })).toBe(false); // 8 chars
  });
  it("rejects a missing/too-short token", () => {
    expect(accepts({ token: "abc", password: "Passw0rd!" })).toBe(false);
  });
});
