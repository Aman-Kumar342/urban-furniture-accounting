import { PrismaClient, AccountType, JournalType } from "@prisma/client";

const prisma = new PrismaClient();

// --- Scaffold seed: system CONFIG only (pre-configured per the official mockup). ---
// Users are seeded in the Auth phase; demo contacts/products/transactions after the
// postEntry() service exists. Full plan: db/seed-plan.md. This seed is idempotent.

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
  for (const a of ACCOUNTS) {
    await prisma.account.upsert({
      where: { code: a.code },
      update: { name: a.name, type: a.type },
      create: a,
    });
  }

  for (const j of JOURNALS) {
    const acc = await prisma.account.findUniqueOrThrow({ where: { name: j.account } });
    await prisma.journal.upsert({
      where: { name: j.name },
      update: { type: j.type, defaultAccountId: acc.id },
      create: { name: j.name, type: j.type, defaultAccountId: acc.id },
    });
  }

  for (const s of SEQUENCES) {
    await prisma.numberSequence.upsert({
      where: { key_year: { key: s.key, year: s.year } },
      update: {},
      create: { key: s.key, year: s.year, nextValue: 1 },
    });
  }

  const [accounts, journals, sequences] = await Promise.all([
    prisma.account.count(),
    prisma.journal.count(),
    prisma.numberSequence.count(),
  ]);
  console.log(
    `Seed complete (config): ${accounts} accounts, ${journals} journals, ${sequences} sequences.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
