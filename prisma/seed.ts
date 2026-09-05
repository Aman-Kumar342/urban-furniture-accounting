import {
  PrismaClient,
  AccountType,
  JournalType,
  Role,
  ContactType,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// --- Seed: system CONFIG (pre-configured per the mockup) + auth users. ---
// Demo contacts/products/transactions are seeded after the postEntry() service exists.
// Full plan: db/seed-plan.md. Idempotent (upserts).

const ACCOUNTS: { code: string; name: string; type: AccountType }[] = [
  { code: "1000", name: "Cash A/c", type: "ASSET" },
  { code: "1010", name: "Bank A/c", type: "ASSET" },
  { code: "1100", name: "Debtors A/c", type: "ASSET" },
  { code: "2000", name: "Creditors A/c", type: "LIABILITY" },
  { code: "3000", name: "Capital A/c", type: "CAPITAL" },
  { code: "4000", name: "Sales Income A/c", type: "INCOME" },
  { code: "5000", name: "Purchase Expense A/c", type: "EXPENSE" },
  { code: "5100", name: "Other Expense A/c", type: "EXPENSE" },
];

const JOURNALS: { name: string; type: JournalType; account: string }[] = [
  { name: "Sales", type: "SALES", account: "Sales Income A/c" },
  { name: "Purchase", type: "PURCHASE", account: "Purchase Expense A/c" },
  { name: "Bank", type: "BANK", account: "Bank A/c" },
  { name: "Cash", type: "CASH", account: "Cash A/c" },
  { name: "Miscellaneous", type: "MISC", account: "Capital A/c" },
];

// year 0 = non-year-scoped
const SEQUENCES: { key: string; year: number }[] = [
  { key: "SO", year: 0 },
  { key: "PO", year: 0 },
  { key: "INV", year: 2026 },
  { key: "BILL", year: 2026 },
  { key: "PAY", year: 2026 },
  { key: "JE", year: 2026 },
];

async function main() {
  // Chart of Accounts
  for (const a of ACCOUNTS) {
    await prisma.account.upsert({
      where: { code: a.code },
      update: { name: a.name, type: a.type },
      create: a,
    });
  }

  // Journals (resolve default account by name)
  for (const j of JOURNALS) {
    const acc = await prisma.account.findUniqueOrThrow({ where: { name: j.account } });
    await prisma.journal.upsert({
      where: { name: j.name },
      update: { type: j.type, defaultAccountId: acc.id },
      create: { name: j.name, type: j.type, defaultAccountId: acc.id },
    });
  }

  // Document number sequences
  for (const s of SEQUENCES) {
    await prisma.numberSequence.upsert({
      where: { key_year: { key: s.key, year: s.year } },
      update: {},
      create: { key: s.key, year: s.year, nextValue: 1 },
    });
  }

  // A Contact for the CONTACT-portal user to be scoped to.
  const nimesh = await prisma.contact.upsert({
    where: { email: "nimesh@example.com" },
    update: {},
    create: {
      name: "Nimesh Pathak",
      type: ContactType.CUSTOMER,
      email: "nimesh@example.com",
      city: "Ahmedabad",
      state: "Gujarat",
      country: "India",
      pincode: "380001",
    },
  });

  // Users (dev passwords — see db/seed-plan.md; real deploy sets its own).
  const USERS: {
    name: string;
    email: string;
    role: Role;
    password: string;
    contactId: string | null;
  }[] = [
    { name: "Admin", email: "admin@urbanfurniture.test", role: Role.ADMIN, password: "Admin@123", contactId: null },
    { name: "Accountant", email: "accountant@urbanfurniture.test", role: Role.ACCOUNTANT, password: "Account@123", contactId: null },
    { name: "Nimesh (Portal)", email: "nimesh@urbanfurniture.test", role: Role.CONTACT, password: "Portal@123", contactId: nimesh.id },
  ];
  for (const u of USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, contactId: u.contactId },
      create: {
        name: u.name,
        email: u.email,
        role: u.role,
        passwordHash,
        contactId: u.contactId,
      },
    });
  }

  const [accounts, journals, sequences, users, contacts] = await Promise.all([
    prisma.account.count(),
    prisma.journal.count(),
    prisma.numberSequence.count(),
    prisma.user.count(),
    prisma.contact.count(),
  ]);
  console.log(
    `Seed complete: ${accounts} accounts, ${journals} journals, ${sequences} sequences, ${users} users, ${contacts} contacts.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
