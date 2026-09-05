import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { signup, login, AuthServiceError } from "@/server/services/auth.service";
import { createContact } from "@/server/services/contact.service";
import { signupSchema } from "@/server/validation/auth";

// Public signup is the CONTACT-portal path: it must only ever mint CONTACT users, link/create a
// CUSTOMER contact by email, and open a session atomically. Elevated roles come from admin
// "Create User", never from here.
const ts = Date.now();
const GOOD_PW = "Passw0rd!"; // 9 chars, upper+lower+special

afterAll(async () => {
  await prisma.$disconnect();
});

describe("public signup", () => {
  it("creates a CONTACT linked to a new CUSTOMER contact, and opens a session", async () => {
    const email = `su+${ts}@uf.test`;
    const { user, token } = await signup({ name: "Sam Buyer", email, password: GOOD_PW });

    expect(user.role).toBe("CONTACT");
    expect(user.contactId).toBeTruthy();
    expect(token).toBeTruthy();

    const contact = await prisma.contact.findUnique({ where: { id: user.contactId! } });
    expect(contact?.type).toBe("CUSTOMER");
    expect(contact?.email).toBe(email);

    // Session row was created inside the same transaction.
    const sessions = await prisma.session.count({ where: { userId: user.id } });
    expect(sessions).toBeGreaterThanOrEqual(1);

    // The freshly created account can sign in with its password.
    const loggedIn = await login({ email, password: GOOD_PW });
    expect(loggedIn.user.id).toBe(user.id);
  });

  it("rejects a duplicate registered email with 409", async () => {
    const email = `dup+${ts}@uf.test`;
    await signup({ name: "First", email, password: GOOD_PW });
    await expect(signup({ name: "Second", email, password: GOOD_PW })).rejects.toMatchObject({
      status: 409,
    });
  });

  it("links an existing Contact that has no portal user, without duplicating it", async () => {
    const email = `link+${ts}@uf.test`;
    const contact = await createContact({ name: "Preexisting", type: "CUSTOMER", email });
    const before = await prisma.contact.count();

    const { user } = await signup({ name: "Preexisting", email, password: GOOD_PW });
    expect(user.contactId).toBe(contact.id);
    expect(await prisma.contact.count()).toBe(before); // linked, not duplicated

    // That contact now has a portal user, so a second signup is rejected.
    await expect(signup({ name: "Again", email, password: GOOD_PW })).rejects.toBeInstanceOf(
      AuthServiceError,
    );
  });
});

describe("signup password policy (backend schema)", () => {
  const base = { name: "A", email: `policy+${ts}@uf.test` };
  const accepts = (password: string) => signupSchema.safeParse({ ...base, password }).success;

  it("accepts a compliant password (>=9, upper, lower, special)", () => {
    expect(accepts("Passw0rd!")).toBe(true);
  });
  it("rejects fewer than 9 characters", () => {
    expect(accepts("Passw0r!")).toBe(false); // 8 chars
  });
  it("rejects a missing lowercase letter", () => {
    expect(accepts("PASSW0RD!")).toBe(false);
  });
  it("rejects a missing uppercase letter", () => {
    expect(accepts("passw0rd!")).toBe(false);
  });
  it("rejects a missing special character", () => {
    expect(accepts("Passw0rd1")).toBe(false);
  });
});
