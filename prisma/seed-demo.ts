/**
 * Demo dataset generator — a coherent FY2026 Urban Furniture business.
 *
 * DESIGN RULES (do not weaken):
 *  - Every transaction is created THROUGH THE REAL SERVICE LAYER (createSalesOrder,
 *    confirmInvoice, registerPayment, ...). The accounting engine (postEntry) produces every
 *    journal entry. This file NEVER inserts a JournalEntry/JournalItem or manufactures a balance.
 *  - The ONLY direct DB write to a document is setting a DRAFT invoice's/bill's `invoiceDate`/
 *    `billDate`/`dueDate` before it is confirmed, so the posted entry carries a realistic FY2026
 *    date (the backend hardcodes those to "today" and exposes no edit endpoint). Draft documents
 *    are freely mutable; the ledger itself is still posted by the service at that date.
 *  - Idempotent: master data upserts by natural key; transactions converge to target counts and
 *    are re-checked per document, so running twice never duplicates and an interrupted run resumes.
 *  - Never truncates or deletes. Additive only.
 *
 * Run: npm run db:seed:demo   (after migrate + db:constraints + the config seed)
 */
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { Prisma, Contact, Product, AnalyticAccount } from "@prisma/client";
import { createContact, archiveContact } from "@/server/services/contact.service";
import { createProduct, archiveProduct } from "@/server/services/product.service";
import { createAnalyticAccount } from "@/server/services/analyticAccount.service";
import { createBudget, confirmBudget, reviseBudget } from "@/server/services/budget.service";
import {
  createSalesOrder,
  confirmSalesOrder,
  createInvoiceFromSalesOrder,
} from "@/server/services/salesOrder.service";
import { confirmInvoice } from "@/server/services/invoice.service";
import {
  createPurchaseOrder,
  confirmPurchaseOrder,
  createBillFromPurchaseOrder,
} from "@/server/services/purchaseOrder.service";
import { confirmBill } from "@/server/services/bill.service";
import { registerPayment } from "@/server/services/payment.service";
import { createManualJournalEntry } from "@/server/services/journalEntry.service";

// ----------------------------------------------------------------------------- config
const DEMO = "@urbanfurniture.demo"; // marks every record this generator owns
const N_SALES_ORDERS = 45;
const N_PURCHASE_ORDERS = 30;
const TODAY = new Date(Date.UTC(2026, 8, 5)); // clamp business dates to <= 2026-09-05 (no future)

// Deterministic PRNG (LCG) so re-runs and dates are stable.
let _seed = 20260906;
const rnd = () => ((_seed = (_seed * 1664525 + 1013904223) >>> 0) / 0xffffffff);
const between = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));

const utc = (m: number, d: number) => new Date(Date.UTC(2026, m, d));
const addDays = (base: Date, days: number) => new Date(base.getTime() + days * 86400000);
const clampToday = (d: Date) => (d.getTime() > TODAY.getTime() ? TODAY : d);
const money2 = (n: number) => Math.round(n * 100) / 100;

// ----------------------------------------------------------------------------- data pools
const CUSTOMERS = [
  ["Prestige Interiors", "Bengaluru", "Karnataka"],
  ["Meera Nair Residence", "Kochi", "Kerala"],
  ["Skyline Offices Pvt Ltd", "Mumbai", "Maharashtra"],
  ["Harmony Homes", "Pune", "Maharashtra"],
  ["Ananya Desai", "Ahmedabad", "Gujarat"],
  ["The Grand Vista Hotel", "Jaipur", "Rajasthan"],
  ["Vikram Reddy", "Hyderabad", "Telangana"],
  ["Coastal Cafe & Co", "Chennai", "Tamil Nadu"],
  ["Lotus School Trust", "Bhopal", "Madhya Pradesh"],
  ["Rohan Malhotra", "New Delhi", "Delhi"],
  ["Evergreen Realtors", "Gurugram", "Haryana"],
  ["Sunrise Clinic", "Surat", "Gujarat"],
] as const;

const VENDORS = [
  ["Timberline Timber Co", "Nagpur", "Maharashtra"],
  ["Deccan Hardware Supplies", "Hubli", "Karnataka"],
  ["National Foam & Fabric", "Ludhiana", "Punjab"],
  ["Sterling Metal Works", "Rajkot", "Gujarat"],
  ["Anchor Logistics", "Mumbai", "Maharashtra"],
  ["BrightAd Media", "Bengaluru", "Karnataka"],
] as const;

const BOTH = [
  ["Woodcraft Traders", "Jodhpur", "Rajasthan"],
  ["Urban Bazaar LLP", "Kolkata", "West Bengal"],
  ["Heritage Furnishings", "Mysuru", "Karnataka"],
  ["Metro Supplies & Sales", "Noida", "Uttar Pradesh"],
] as const;

interface ProductSpec {
  name: string;
  type: "GOODS" | "SERVICE";
  category: string;
  salesPrice: number;
  cost: number;
}
const PRODUCTS: ProductSpec[] = [
  { name: "Executive Desk", type: "GOODS", category: "Office Furniture", salesPrice: 18500, cost: 11000 },
  { name: "Ergonomic Office Chair", type: "GOODS", category: "Office Furniture", salesPrice: 8900, cost: 5200 },
  { name: "Conference Table", type: "GOODS", category: "Office Furniture", salesPrice: 32000, cost: 19000 },
  { name: "Filing Cabinet", type: "GOODS", category: "Office Furniture", salesPrice: 9500, cost: 5600 },
  { name: "Oak Dining Table", type: "GOODS", category: "Home Furniture", salesPrice: 24500, cost: 14500 },
  { name: "Teak Coffee Table", type: "GOODS", category: "Home Furniture", salesPrice: 12800, cost: 7400 },
  { name: "Bookshelf Unit", type: "GOODS", category: "Home Furniture", salesPrice: 11200, cost: 6600 },
  { name: "Fabric Sofa 3-Seater", type: "GOODS", category: "Seating", salesPrice: 42000, cost: 26000 },
  { name: "Recliner Armchair", type: "GOODS", category: "Seating", salesPrice: 28500, cost: 17500 },
  { name: "Dining Chair (Set of 2)", type: "GOODS", category: "Seating", salesPrice: 6800, cost: 3900 },
  { name: "Bar Stool", type: "GOODS", category: "Seating", salesPrice: 4500, cost: 2600 },
  { name: "Wardrobe 4-Door", type: "GOODS", category: "Storage", salesPrice: 38000, cost: 23000 },
  { name: "Shoe Rack", type: "GOODS", category: "Storage", salesPrice: 5200, cost: 2900 },
  { name: "Storage Ottoman", type: "GOODS", category: "Storage", salesPrice: 7400, cost: 4100 },
  { name: "Assembly & Installation", type: "SERVICE", category: "Services", salesPrice: 2500, cost: 1400 },
  { name: "Interior Consultation", type: "SERVICE", category: "Services", salesPrice: 5000, cost: 2800 },
];

const INCOME_ANALYTICS = ["Furniture Sales", "Seating Sales", "Storage Sales"] as const;
const EXPENSE_ANALYTICS = ["Raw Materials", "Logistics", "Marketing"] as const;

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");

// ----------------------------------------------------------------------------- helpers
async function getAdminId(): Promise<string> {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) throw new Error("No ADMIN user found — run the config seed first.");
  return admin.id;
}

async function ensureContact(
  name: string,
  type: "CUSTOMER" | "VENDOR" | "BOTH",
  city: string,
  state: string,
): Promise<Contact> {
  const email = `${slug(name)}${DEMO}`;
  const existing = await prisma.contact.findUnique({ where: { email } });
  if (existing) return existing;
  return createContact({
    name,
    type,
    email,
    phone: `+91 ${between(70, 99)}${between(10000000, 99999999)}`,
    street: `${between(1, 240)}, ${["MG Road", "Industrial Area", "Ring Road", "Market Street", "Sector 4"][between(0, 4)]}`,
    city,
    state,
    country: "India",
    pincode: `${between(100000, 899999)}`,
  });
}

async function ensureProduct(spec: ProductSpec): Promise<Product> {
  const existing = await prisma.product.findFirst({ where: { name: spec.name } });
  if (existing) return existing;
  return createProduct({
    name: spec.name,
    type: spec.type,
    categoryName: spec.category,
    salesPrice: spec.salesPrice,
    cost: spec.cost,
  });
}

async function ensureAnalytic(name: string, type: "INCOME" | "EXPENSE"): Promise<AnalyticAccount> {
  const existing = await prisma.analyticAccount.findUnique({ where: { name } });
  if (existing) return existing;
  return createAnalyticAccount({ name, type });
}

function incomeAnalyticFor(category: string): (typeof INCOME_ANALYTICS)[number] {
  if (category === "Seating") return "Seating Sales";
  if (category === "Storage") return "Storage Sales";
  return "Furniture Sales";
}

// ----------------------------------------------------------------------------- master data
async function seedMasterData() {
  const analyticIncome = new Map<string, AnalyticAccount>();
  for (const n of INCOME_ANALYTICS) analyticIncome.set(n, await ensureAnalytic(n, "INCOME"));
  const analyticExpense = new Map<string, AnalyticAccount>();
  for (const n of EXPENSE_ANALYTICS) analyticExpense.set(n, await ensureAnalytic(n, "EXPENSE"));

  const products: Product[] = [];
  for (const spec of PRODUCTS) products.push(await ensureProduct(spec));
  const productCategory = new Map(products.map((p, i) => [p.id, PRODUCTS[i].category]));

  const customers: Contact[] = [];
  for (const [name, city, state] of CUSTOMERS) customers.push(await ensureContact(name, "CUSTOMER", city, state));
  const vendors: Contact[] = [];
  for (const [name, city, state] of VENDORS) vendors.push(await ensureContact(name, "VENDOR", city, state));
  for (const [name, city, state] of BOTH) {
    const c = await ensureContact(name, "BOTH", city, state);
    customers.push(c);
    vendors.push(c);
  }

  return { customers, vendors, products, productCategory, analyticIncome, analyticExpense };
}

// ----------------------------------------------------------------------------- budgets
async function seedBudgets(
  adminId: string,
  income: Map<string, AnalyticAccount>,
  expense: Map<string, AnalyticAccount>,
) {
  const line = (a: AnalyticAccount, committedAmount: number) => ({ analyticAccountId: a.id, committedAmount });

  async function ensureBudget(
    name: string,
    periodStart: Date,
    periodEnd: Date,
    lines: { analyticAccountId: string; committedAmount: number }[],
    confirm: boolean,
  ) {
    let b = await prisma.budget.findFirst({ where: { name } });
    if (!b) b = await createBudget({ name, periodStart, periodEnd, responsibleId: adminId, lines });
    if (confirm && b.state === "DRAFT") await confirmBudget(b.id);
    return prisma.budget.findUniqueOrThrow({ where: { id: b.id } });
  }

  await ensureBudget(
    "FY2026 Operating Budget",
    utc(0, 1),
    utc(11, 31),
    [
      line(income.get("Furniture Sales")!, 1_500_000),
      line(income.get("Seating Sales")!, 600_000),
      line(income.get("Storage Sales")!, 400_000),
      line(expense.get("Raw Materials")!, 900_000),
      line(expense.get("Logistics")!, 200_000),
      line(expense.get("Marketing")!, 150_000),
    ],
    true,
  );

  const q3 = await ensureBudget(
    "Q3 2026 Sales Push",
    utc(6, 1),
    utc(8, 30),
    [
      line(income.get("Furniture Sales")!, 500_000),
      line(expense.get("Marketing")!, 80_000),
      line(expense.get("Logistics")!, 60_000),
    ],
    true,
  );

  await ensureBudget(
    "FY2026 Capex Plan",
    utc(0, 1),
    utc(11, 31),
    [line(income.get("Storage Sales")!, 200_000), line(expense.get("Raw Materials")!, 300_000)],
    false, // stays DRAFT
  );

  // Demonstrate a REVISED budget: revise the confirmed Q3 budget (marks it REVISED, creates a DRAFT revision).
  if (q3.state === "CONFIRMED") {
    const revisionExists = await prisma.budget.findFirst({ where: { revisionOfId: q3.id } });
    if (!revisionExists) await reviseBudget(q3.id);
  }
}

// ----------------------------------------------------------------------------- sales
async function seedSales(
  adminId: string,
  customers: Contact[],
  products: Product[],
  productCategory: Map<string, string>,
  income: Map<string, AnalyticAccount>,
) {
  const existing = await prisma.salesOrder.count({ where: { customer: { email: { endsWith: DEMO } } } });
  for (let i = existing; i < N_SALES_ORDERS; i++) {
    const customer = customers[i % customers.length];
    const orderDate = utc(i % 9, 1 + ((i * 7) % 26));
    const nLines = 1 + (i % 3);
    const lines = [];
    for (let k = 0; k < nLines; k++) {
      const p = products[(i * 3 + k) % products.length];
      const analytic = income.get(incomeAnalyticFor(productCategory.get(p.id) ?? "Office Furniture"))!;
      lines.push({
        productId: p.id,
        quantity: between(1, 8),
        unitPrice: Number(p.salesPrice),
        analyticAccountId: analytic.id,
      });
    }
    await createSalesOrder({ customerId: customer.id, orderDate, lines }, adminId);
  }

  // Lifecycle pass (convergent: only advances what isn't already advanced).
  const orders = await prisma.salesOrder.findMany({
    where: { customer: { email: { endsWith: DEMO } } },
    orderBy: { number: "asc" },
    include: { invoice: true },
  });
  for (let i = 0; i < orders.length; i++) {
    const so = orders[i];
    if (i % 5 === 0) continue; // ~20% stay DRAFT orders
    if (so.state === "DRAFT") await confirmSalesOrder(so.id);
    if (i % 8 === 0) continue; // a few confirmed orders left un-invoiced

    let invoice =
      so.invoice ?? (await prisma.customerInvoice.findUnique({ where: { salesOrderId: so.id } }));
    if (!invoice) {
      const created = await createInvoiceFromSalesOrder(so.id, adminId);
      const invDate = clampToday(addDays(so.orderDate, 5));
      await prisma.customerInvoice.update({
        where: { id: created.id },
        data: { invoiceDate: invDate, dueDate: addDays(invDate, 30) },
      });
      invoice = await prisma.customerInvoice.findUniqueOrThrow({ where: { id: created.id } });
    }
    if (invoice.state === "DRAFT" && i % 7 !== 0) {
      await confirmInvoice(invoice.id, adminId);
      invoice = await prisma.customerInvoice.findUniqueOrThrow({ where: { id: invoice.id } });
    }
    if (invoice.state !== "CONFIRMED") continue; // draft invoice → no payment

    const bucket = i % 3; // 0 full, 1 partial, 2 none
    if (bucket === 2 || invoice.paymentStatus === "PAID") continue;
    const due = Number(invoice.amountDue);
    if (due <= 0) continue;
    const payDate = clampToday(addDays(invoice.invoiceDate, 10));
    const method: "CASH" | "BANK" = i % 2 ? "BANK" : "CASH";
    if (bucket === 0) {
      await registerPayment({ invoiceId: invoice.id, method, amount: due, paymentDate: payDate }, adminId);
    } else if (invoice.paymentStatus === "NOT_PAID") {
      const amt = money2(Number(invoice.amountTotal) * 0.5);
      if (amt > 0 && amt < due) {
        await registerPayment({ invoiceId: invoice.id, method, amount: amt, paymentDate: payDate }, adminId);
      }
    }
  }
}

// ----------------------------------------------------------------------------- purchases
async function seedPurchases(
  adminId: string,
  vendors: Contact[],
  products: Product[],
  expense: Map<string, AnalyticAccount>,
) {
  const expenseFor = (idx: number) =>
    expense.get(idx % 5 === 0 ? "Marketing" : idx % 3 === 0 ? "Logistics" : "Raw Materials")!;

  const existing = await prisma.purchaseOrder.count({ where: { vendor: { email: { endsWith: DEMO } } } });
  for (let i = existing; i < N_PURCHASE_ORDERS; i++) {
    const vendor = vendors[i % vendors.length];
    const orderDate = utc(i % 9, 2 + ((i * 5) % 25));
    const nLines = 1 + (i % 2);
    const lines = [];
    for (let k = 0; k < nLines; k++) {
      const p = products[(i * 2 + k) % products.length];
      lines.push({
        productId: p.id,
        quantity: between(2, 12),
        unitPrice: Number(p.cost),
        analyticAccountId: expenseFor(i + k).id,
      });
    }
    await createPurchaseOrder({ vendorId: vendor.id, orderDate, lines }, adminId);
  }

  const orders = await prisma.purchaseOrder.findMany({
    where: { vendor: { email: { endsWith: DEMO } } },
    orderBy: { number: "asc" },
    include: { bill: true },
  });
  for (let i = 0; i < orders.length; i++) {
    const po = orders[i];
    if (i % 5 === 0) continue; // ~20% stay DRAFT
    if (po.state === "DRAFT") await confirmPurchaseOrder(po.id);
    if (i % 7 === 0) continue; // a few confirmed POs left un-billed

    let bill = po.bill ?? (await prisma.vendorBill.findUnique({ where: { purchaseOrderId: po.id } }));
    if (!bill) {
      const created = await createBillFromPurchaseOrder(po.id, adminId);
      const billDate = clampToday(addDays(po.orderDate, 4));
      await prisma.vendorBill.update({
        where: { id: created.id },
        data: { billDate, dueDate: addDays(billDate, 30) },
      });
      bill = await prisma.vendorBill.findUniqueOrThrow({ where: { id: created.id } });
    }
    if (bill.state === "DRAFT" && i % 6 !== 0) {
      await confirmBill(bill.id, adminId);
      bill = await prisma.vendorBill.findUniqueOrThrow({ where: { id: bill.id } });
    }
    if (bill.state !== "CONFIRMED") continue;

    const bucket = i % 3;
    if (bucket === 2 || bill.paymentStatus === "PAID") continue;
    const due = Number(bill.amountDue);
    if (due <= 0) continue;
    const payDate = clampToday(addDays(bill.billDate, 12));
    const method: "CASH" | "BANK" = i % 2 ? "BANK" : "CASH";
    if (bucket === 0) {
      await registerPayment({ billId: bill.id, method, amount: due, paymentDate: payDate }, adminId);
    } else if (bill.paymentStatus === "NOT_PAID") {
      const amt = money2(Number(bill.amountTotal) * 0.5);
      if (amt > 0 && amt < due) {
        await registerPayment({ billId: bill.id, method, amount: amt, paymentDate: payDate }, adminId);
      }
    }
  }
}

// ----------------------------------------------------------------------------- manual entries
async function seedManualEntries(adminId: string) {
  const misc = await prisma.journal.findFirstOrThrow({ where: { type: "MISC" } });
  const acc = async (name: string) => (await prisma.account.findUniqueOrThrow({ where: { name } })).id;
  const bank = await acc("Bank A/c");
  const capital = await acc("Capital A/c");
  const cash = await acc("Cash A/c");
  const otherExpense = await acc("Other Expense A/c");

  const specs: { ref: string; date: Date; lines: { accountId: string; debit?: number; credit?: number }[] }[] = [
    { ref: "DEMO-OPENING-CAPITAL", date: utc(0, 1), lines: [{ accountId: bank, debit: 500000 }, { accountId: capital, credit: 500000 }] },
    { ref: "DEMO-RENT-Q1", date: utc(2, 28), lines: [{ accountId: otherExpense, debit: 45000 }, { accountId: cash, credit: 45000 }] },
    { ref: "DEMO-UTILITIES-Q2", date: utc(5, 27), lines: [{ accountId: otherExpense, debit: 18500 }, { accountId: bank, credit: 18500 }] },
    { ref: "DEMO-INSURANCE-Q3", date: utc(7, 20), lines: [{ accountId: otherExpense, debit: 26000 }, { accountId: bank, credit: 26000 }] },
  ];
  for (const s of specs) {
    if (await prisma.journalEntry.findFirst({ where: { reference: s.ref } })) continue;
    await createManualJournalEntry({ journalId: misc.id, date: s.date, reference: s.ref, lines: s.lines }, adminId);
  }
}

// ----------------------------------------------------------------------------- archived + portal
async function seedArchivedExamples() {
  // Two discontinued products and one inactive contact, with no documents, then archived —
  // demonstrates the archived state without affecting any transaction.
  const disc: ProductSpec[] = [
    { name: "Discontinued Plastic Chair", type: "GOODS", category: "Seating", salesPrice: 1200, cost: 700 },
    { name: "Discontinued Metal Locker", type: "GOODS", category: "Storage", salesPrice: 3400, cost: 2000 },
  ];
  for (const spec of disc) {
    const p = await ensureProduct(spec);
    if (!p.isArchived) await archiveProduct(p.id);
  }
  const c = await ensureContact("Former Supplier Co", "VENDOR", "Indore", "Madhya Pradesh");
  if (!c.isArchived) await archiveContact(c.id);
}

async function ensurePortalUser() {
  // Link a CONTACT (portal) user to a demo customer that actually has confirmed invoices, so the
  // portal demonstrates a populated customer view. Same direct-upsert pattern as the config seed.
  const email = "portal@urbanfurniture.demo";
  const passwordHash = await bcrypt.hash("Portal@2026", 10);
  const target = await prisma.contact.findFirst({
    where: { email: { endsWith: DEMO }, customerInvoices: { some: { state: "CONFIRMED" } } },
    orderBy: { name: "asc" },
  });
  if (!target) return;
  // contactId is unique (one portal user per contact) — only take it if free (or already ours).
  const holder = await prisma.user.findUnique({ where: { contactId: target.id } });
  const contactId = !holder || holder.email === email ? target.id : null;
  await prisma.user.upsert({
    where: { email },
    update: { contactId },
    create: { name: `${target.name} (Portal)`, email, role: "CONTACT", passwordHash, contactId },
  });
}

// ----------------------------------------------------------------------------- run
async function main() {
  const adminId = await getAdminId();
  console.log("Seeding demo dataset (FY2026)…");

  const { customers, vendors, products, productCategory, analyticIncome, analyticExpense } = await seedMasterData();
  await seedBudgets(adminId, analyticIncome, analyticExpense);
  await seedSales(adminId, customers, products, productCategory, analyticIncome);
  await seedPurchases(adminId, vendors, products, analyticExpense);
  await seedManualEntries(adminId);
  await seedArchivedExamples();
  await ensurePortalUser();

  // Summary
  const where = (email: Prisma.StringNullableFilter) => ({ email });
  const [contacts, prods, analytics, budgets, so, inv, po, bill, pay, je] = await Promise.all([
    prisma.contact.count({ where: { email: { endsWith: DEMO } } }),
    prisma.product.count(),
    prisma.analyticAccount.count(),
    prisma.budget.count(),
    prisma.salesOrder.count({ where: { customer: where({ endsWith: DEMO }) } }),
    prisma.customerInvoice.count({ where: { customer: where({ endsWith: DEMO }) } }),
    prisma.purchaseOrder.count({ where: { vendor: where({ endsWith: DEMO }) } }),
    prisma.vendorBill.count({ where: { vendor: where({ endsWith: DEMO }) } }),
    prisma.payment.count(),
    prisma.journalEntry.count(),
  ]);
  console.log(
    `Demo seed complete:\n  contacts=${contacts} products=${prods} analytics=${analytics} budgets=${budgets}\n  salesOrders=${so} invoices=${inv} purchaseOrders=${po} bills=${bill}\n  payments=${pay} journalEntries=${je}`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
