/**
 * Demo-data reconciliation. Verifies accounting correctness of the seeded FY2026 dataset.
 *
 * The local dev database accumulates integration-test rows, so this reconciles the DEMO dataset
 * specifically: its records are marked by the "@urbanfurniture.demo" contact email domain (and
 * "DEMO-" manual-entry references). Every check is scoped to those. Read-only; exits non-zero on
 * any failure. Run: npm run verify:demo
 */
import { prisma } from "@/lib/prisma";
import { getBalanceSheet } from "@/server/services/report.service";
import { getBudgetReport } from "@/server/services/budget.service";
import { listInvoices } from "@/server/services/invoice.service";

const DEMO = "@urbanfurniture.demo";
const demoContact = { email: { endsWith: DEMO } } as const;

let failures = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "  ✓" : "  ✗ FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};
const num = (v: unknown) => Number(v as number);
const money = (v: unknown) => num(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function main() {
  console.log("\n=== DEMO DATA RECONCILIATION (FY2026, scoped to @urbanfurniture.demo) ===\n");

  // ---- 1. Record counts (demo-scoped) ----
  const [contacts, so, inv, po, bill, pay, allocs] = await Promise.all([
    prisma.contact.count({ where: demoContact }),
    prisma.salesOrder.count({ where: { customer: demoContact } }),
    prisma.customerInvoice.count({ where: { customer: demoContact } }),
    prisma.purchaseOrder.count({ where: { vendor: demoContact } }),
    prisma.vendorBill.count({ where: { vendor: demoContact } }),
    prisma.payment.count({ where: { partner: demoContact } }),
    prisma.paymentAllocation.count({ where: { payment: { partner: demoContact } } }),
  ]);
  // Demo products/analytics: those referenced by demo documents/budgets (the dev DB also holds
  // unrelated integration-test master data, so a global count would be misleading).
  const demoBudget = { OR: [{ name: { contains: "FY2026" } }, { name: { contains: "Q3 2026" } }] };
  const products = await prisma.product.count({
    where: {
      OR: [
        { soLines: { some: { order: { customer: demoContact } } } },
        { poLines: { some: { order: { vendor: demoContact } } } },
        { name: { startsWith: "Discontinued" } },
      ],
    },
  });
  const analytics = await prisma.analyticAccount.count({
    where: {
      OR: [
        { soLines: { some: { order: { customer: demoContact } } } },
        { poLines: { some: { order: { vendor: demoContact } } } },
        { budgetLines: { some: { budget: demoBudget } } },
      ],
    },
  });
  const budgets = await prisma.budget.count({ where: demoBudget });

  // demo journal entries = posted entries whose partner is a demo contact, or DEMO- manual refs.
  const demoEntryRows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT e.id FROM "JournalEntry" e WHERE e.state='POSTED' AND (
        e."partnerId" IN (SELECT id FROM "Contact" WHERE email LIKE '%${DEMO}')
        OR e.reference LIKE 'DEMO-%')`,
  );
  const demoEntryIds = demoEntryRows.map((r) => r.id);
  const demoItems = await prisma.journalItem.count({ where: { entryId: { in: demoEntryIds } } });
  const meaningful = contacts + products + analytics + budgets + so + inv + po + bill + pay;

  console.log("RECORD COUNTS (demo)");
  console.log(`  master: contacts=${contacts} products=${products} analytics=${analytics} budgets=${budgets}`);
  console.log(`  docs:   salesOrders=${so} invoices=${inv} purchaseOrders=${po} bills=${bill}`);
  console.log(`  pay:    payments=${pay} allocations=${allocs}`);
  console.log(`  ledger: journalEntries=${demoEntryIds.length} journalItems=${demoItems}`);
  console.log(`  => meaningful business records (master+docs+payments) = ${meaningful}\n`);

  // ---- 2. Every demo posted entry balances ----
  console.log("LEDGER INTEGRITY (demo)");
  const unbalanced = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT e.id FROM "JournalEntry" e JOIN "JournalItem" i ON i."entryId"=e.id
     WHERE e.id = ANY($1::text[])
     GROUP BY e.id HAVING COALESCE(SUM(i.debit),0) <> COALESCE(SUM(i.credit),0)`,
    demoEntryIds,
  );
  check(`all ${demoEntryIds.length} demo posted entries balance (Σdebit = Σcredit)`, unbalanced.length === 0, unbalanced.length ? `${unbalanced.length} unbalanced` : "");

  // Trial balance across ALL demo entries, grouped by account type.
  const tb = await prisma.$queryRawUnsafe<{ type: string; d: number; c: number }[]>(
    `SELECT a.type, COALESCE(SUM(i.debit),0)::float8 d, COALESCE(SUM(i.credit),0)::float8 c
     FROM "JournalItem" i JOIN "Account" a ON a.id=i."accountId"
     WHERE i."entryId" = ANY($1::text[]) GROUP BY a.type`,
    demoEntryIds,
  );
  const byType = Object.fromEntries(tb.map((r) => [r.type, { d: num(r.d), c: num(r.c) }]));
  const g = (t: string) => byType[t] ?? { d: 0, c: 0 };
  const totalDebit = tb.reduce((s, r) => s + num(r.d), 0);
  const totalCredit = tb.reduce((s, r) => s + num(r.c), 0);
  check("demo trial balance balances (Σ all debits = Σ all credits)", Math.abs(totalDebit - totalCredit) < 0.01, `Dr ${money(totalDebit)} / Cr ${money(totalCredit)}`);

  // ---- 3. Demo P&L + Balance Sheet from the demo subledger ----
  const income = g("INCOME").c - g("INCOME").d;
  const expenses = g("EXPENSE").d - g("EXPENSE").c;
  const netIncome = income - expenses;
  const assets = g("ASSET").d - g("ASSET").c;
  const liabilities = g("LIABILITY").c - g("LIABILITY").d;
  const capital = g("CAPITAL").c - g("CAPITAL").d;
  console.log("\nDEMO REPORTS (from the demo subledger)");
  check("P&L has income", income > 0, `income=${money(income)}`);
  check("P&L has expenses", expenses > 0, `expenses=${money(expenses)}`);
  check("Balance Sheet balances (Assets = Liabilities + Capital + Earnings)", Math.abs(assets - (liabilities + capital + netIncome)) < 0.01,
    `assets=${money(assets)} vs L+C+E=${money(liabilities + capital + netIncome)}`);
  console.log(`     income=${money(income)} expenses=${money(expenses)} netIncome=${money(netIncome)}`);
  console.log(`     assets=${money(assets)} liabilities=${money(liabilities)} capital=${money(capital)}`);

  // ---- 4. Document payment integrity (demo) ----
  console.log("\nDOCUMENT INTEGRITY (demo)");
  for (const [kind, rows] of [
    ["invoices", await prisma.customerInvoice.findMany({ where: { customer: demoContact }, include: { allocations: true } })],
    ["bills", await prisma.vendorBill.findMany({ where: { vendor: demoContact }, include: { allocations: true } })],
  ] as const) {
    let badAmt = 0, overpaid = 0, badAlloc = 0, badStatus = 0;
    for (const d of rows) {
      const total = num(d.amountTotal), paid = num(d.amountPaid), due = num(d.amountDue);
      if (Math.abs(due - (total - paid)) > 0.001) badAmt++;
      if (paid > total + 0.001) overpaid++;
      if (Math.abs(d.allocations.reduce((s, a) => s + num(a.amount), 0) - paid) > 0.001) badAlloc++;
      const okStatus =
        (d.paymentStatus === "NOT_PAID" && paid === 0) ||
        (d.paymentStatus === "PARTIAL" && paid > 0 && paid < total) ||
        (d.paymentStatus === "PAID" && total > 0 && Math.abs(due) < 0.001);
      if (!okStatus) badStatus++;
    }
    check(`${kind}: amountDue = amountTotal − amountPaid`, badAmt === 0);
    check(`${kind}: no overpayment`, overpaid === 0);
    check(`${kind}: Σ allocations = amountPaid`, badAlloc === 0);
    check(`${kind}: paymentStatus consistent with amounts`, badStatus === 0);
  }

  // ---- 5. Payment direction (demo) ----
  const payments = await prisma.payment.findMany({ where: { partner: demoContact }, include: { allocations: true } });
  let badDir = 0;
  for (const p of payments) {
    const toInvoice = p.allocations.some((a) => a.invoiceId);
    const toBill = p.allocations.some((a) => a.billId);
    if (p.direction === "RECEIVE" && !toInvoice) badDir++;
    if (p.direction === "SEND" && !toBill) badDir++;
  }
  check("payment direction matches settled document (RECEIVE↔invoice, SEND↔bill)", badDir === 0);

  // ---- 6. Budget achieved reconciles ----
  console.log("\nBUDGETS (demo)");
  const budgetRows = await prisma.budget.findMany({ where: { OR: [{ name: { contains: "FY2026" } }, { name: { contains: "Q3 2026" } }] } });
  let mismatch = 0, anyAchieved = false;
  for (const b of budgetRows) {
    const rep = await getBudgetReport(b.id);
    for (const l of rep.lines) {
      const rc = l.type === "EXPENSE"
        ? await prisma.vendorBillLine.aggregate({ _sum: { lineTotal: true }, where: { analyticAccountId: l.analyticAccountId, bill: { state: "CONFIRMED", billDate: { gte: b.periodStart, lte: b.periodEnd } } } })
        : await prisma.invoiceLine.aggregate({ _sum: { lineTotal: true }, where: { analyticAccountId: l.analyticAccountId, invoice: { state: "CONFIRMED", invoiceDate: { gte: b.periodStart, lte: b.periodEnd } } } });
      if (Math.abs(num(rc._sum.lineTotal ?? 0) - num(l.achieved)) > 0.001) mismatch++;
      if (num(l.achieved) > 0) anyAchieved = true;
    }
  }
  check("budget 'achieved' matches independent recompute of confirmed tagged lines", mismatch === 0);
  check("at least one budget line shows non-zero achieved", anyAchieved);
  const states = await prisma.budget.groupBy({ by: ["state"], where: { OR: [{ name: { contains: "FY2026" } }, { name: { contains: "Q3 2026" } }] }, _count: true });
  console.log(`     budget states: ${states.map((s) => `${s.state}=${s._count}`).join(", ")}`);

  // ---- 7. Status variety (demo) ----
  console.log("\nSTATUS VARIETY (demo)");
  const invStatus = await prisma.customerInvoice.groupBy({ by: ["state", "paymentStatus"], where: { customer: demoContact }, _count: true });
  const billStatus = await prisma.vendorBill.groupBy({ by: ["state", "paymentStatus"], where: { vendor: demoContact }, _count: true });
  console.log(`     invoices: ${invStatus.map((s) => `${s.state}/${s.paymentStatus}=${s._count}`).join(", ")}`);
  console.log(`     bills:    ${billStatus.map((s) => `${s.state}/${s.paymentStatus}=${s._count}`).join(", ")}`);
  const hasPaid = invStatus.some((s) => s.paymentStatus === "PAID");
  const hasPartial = invStatus.some((s) => s.paymentStatus === "PARTIAL");
  const hasDraftInv = invStatus.some((s) => s.state === "DRAFT");
  const hasDraftSO = (await prisma.salesOrder.count({ where: { customer: demoContact, state: "DRAFT" } })) > 0;
  check("sales data spans PAID + PARTIAL + draft states", hasPaid && hasPartial && hasDraftInv && hasDraftSO);

  // ---- 8. Portal isolation ----
  console.log("\nPORTAL ISOLATION");
  const portal = await prisma.user.findUnique({ where: { email: "portal@urbanfurniture.demo" } });
  if (portal?.contactId) {
    const scoped = await listInvoices(portal);
    const leak = scoped.filter((i) => i.customerId !== portal.contactId).length;
    check("portal user sees only its own invoices", leak === 0, `${scoped.length} invoices visible, ${leak} leaked`);
  } else check("portal user exists and is linked to a contact", false);

  // ---- 9. Date spread + global sanity ----
  const spread = await prisma.$queryRawUnsafe<{ months: number }[]>(
    `SELECT COUNT(DISTINCT date_trunc('month', "invoiceDate"))::int AS months FROM "CustomerInvoice" WHERE "customerId" IN (SELECT id FROM "Contact" WHERE email LIKE '%${DEMO}')`,
  );
  console.log(`\n  demo invoice date spread: ${spread[0]?.months ?? 0} distinct months`);
  const globalBS = await getBalanceSheet(2026);
  console.log(`  (global Balance Sheet incl. residual test data also balances: ${globalBS.balanced})`);

  console.log(`\n=== ${failures === 0 ? "RECONCILIATION PASSED" : `RECONCILIATION FAILED (${failures} failures)`} ===\n`);
  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
