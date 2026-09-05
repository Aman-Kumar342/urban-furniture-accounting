import crypto from "crypto";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// DB-backed sessions. A random opaque token goes to the client; only its SHA-256 hash is
// stored, so a DB read never exposes a usable token. Deleting the row logs the session out.
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export interface SessionMeta {
  userAgent?: string | null;
  ipAddress?: string | null;
}

export async function createSession(userId: string, meta: SessionMeta = {}) {
  const token = crypto.randomBytes(32).toString("base64url");
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      userAgent: meta.userAgent ?? null,
      ipAddress: meta.ipAddress ?? null,
    },
  });
  return { token, expiresAt };
}

export async function getUserByToken(token: string): Promise<User | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  if (!session.user.isActive) return null;
  return session.user;
}

export async function destroySession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { tokenHash: sha256(token) } });
}
