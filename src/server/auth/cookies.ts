import { cookies } from "next/headers";

const COOKIE_NAME = "uf_session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function baseOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, token, { ...baseOptions(), maxAge: MAX_AGE });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, "", { ...baseOptions(), maxAge: 0 });
}

export async function readSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(COOKIE_NAME)?.value ?? null;
}
