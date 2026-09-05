import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "@/server/auth/password";

describe("password hashing", () => {
  it("verifies a correct password", async () => {
    const hash = await hashPassword("Secret@123");
    expect(await verifyPassword("Secret@123", hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("Secret@123");
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("never stores the plaintext", async () => {
    const hash = await hashPassword("Secret@123");
    expect(hash).not.toContain("Secret@123");
  });

  it("salts each hash (same input -> different hashes)", async () => {
    const a = await hashPassword("same-input");
    const b = await hashPassword("same-input");
    expect(a).not.toEqual(b);
  });
});
