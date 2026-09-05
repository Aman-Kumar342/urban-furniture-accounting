import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { createUserByAdmin } from "@/server/services/admin.service";
import { login, AuthServiceError } from "@/server/services/auth.service";
import { createContact } from "@/server/services/contact.service";
import { createUserSchema } from "@/server/validation/auth";

// Admin "Create User" can mint any role. Staff (ADMIN/ACCOUNTANT) have no Contact; a CONTACT
// links/creates a CUSTOMER contact, exactly like public signup — but no session is opened.
const ts = Date.now();
const GOOD_PW = "Passw0rd!";

afterAll(async () => {
  await prisma.$disconnect();
});

describe("admin create user", () => {
  it("creates an ACCOUNTANT with no linked contact, able to sign in", async () => {
    const email = `acct+${ts}@uf.test`;
    const user = await createUserByAdmin({ name: "Priya Menon", email, role: "ACCOUNTANT", password: GOOD_PW });
    expect(user.role).toBe("ACCOUNTANT");
    expect(user.contactId).toBeNull();
    const loggedIn = await login({ email, password: GOOD_PW });
    expect(loggedIn.user.id).toBe(user.id);
  });

  it("creates an ADMIN with no linked contact", async () => {
    const email = `adm+${ts}@uf.test`;
    const user = await createUserByAdmin({ name: "Owner", email, role: "ADMIN", password: GOOD_PW });
    expect(user.role).toBe("ADMIN");
    expect(user.contactId).toBeNull();
  });

  it("creates a CONTACT linked to a new CUSTOMER contact", async () => {
    const email = `portal+${ts}@uf.test`;
    const user = await createUserByAdmin({ name: "Client Co", email, role: "CONTACT", password: GOOD_PW });
    expect(user.role).toBe("CONTACT");
    expect(user.contactId).toBeTruthy();
    const contact = await prisma.contact.findUnique({ where: { id: user.contactId! } });
    expect(contact?.type).toBe("CUSTOMER");
    expect(contact?.email).toBe(email);
  });

  it("links an existing Contact (no portal user) instead of duplicating it", async () => {
    const email = `existing+${ts}@uf.test`;
    const contact = await createContact({ name: "Existing Client", type: "CUSTOMER", email });
    const before = await prisma.contact.count();
    const user = await createUserByAdmin({ name: "Existing Client", email, role: "CONTACT", password: GOOD_PW });
    expect(user.contactId).toBe(contact.id);
    expect(await prisma.contact.count()).toBe(before);
  });

  it("rejects a duplicate registered email with 409", async () => {
    const email = `dupe+${ts}@uf.test`;
    await createUserByAdmin({ name: "First", email, role: "ACCOUNTANT", password: GOOD_PW });
    await expect(
      createUserByAdmin({ name: "Second", email, role: "ADMIN", password: GOOD_PW }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      createUserByAdmin({ name: "Second", email, role: "ADMIN", password: GOOD_PW }),
    ).rejects.toBeInstanceOf(AuthServiceError);
  });
});

describe("createUser schema", () => {
  const base = { name: "A", email: `sch+${ts}@uf.test`, password: "Passw0rd!" };
  const accepts = (patch: Record<string, unknown>) => createUserSchema.safeParse({ ...base, ...patch }).success;

  it("accepts each valid role", () => {
    expect(accepts({ role: "ADMIN" })).toBe(true);
    expect(accepts({ role: "ACCOUNTANT" })).toBe(true);
    expect(accepts({ role: "CONTACT" })).toBe(true);
  });
  it("rejects an unknown role", () => {
    expect(accepts({ role: "ADMINISTRATOR" })).toBe(false);
    expect(accepts({ role: "" })).toBe(false);
  });
  it("enforces the shared password policy", () => {
    expect(accepts({ role: "ADMIN", password: "Passw0r!" })).toBe(false); // 8 chars
    expect(accepts({ role: "ADMIN", password: "passw0rd!" })).toBe(false); // no uppercase
    expect(accepts({ role: "ADMIN", password: "Passw0rd1" })).toBe(false); // no special
  });
});
