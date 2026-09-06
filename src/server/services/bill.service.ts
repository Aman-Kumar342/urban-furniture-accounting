import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { money, round2 } from "@/lib/money";
import { NotFound, Conflict, Unprocessable } from "@/lib/errors";
import { postEntry } from "./posting.service";
import { checkBudgetWarnings } from "./budget.service";
import type { UpdateBillInput } from "@/server/validation/purchase";

export function listBills(user: User) {
  // Contact-portal users (a vendor) see only their own bills (server-side ownership).
  const where = user.role === "CONTACT" ? { vendorId: user.contactId ?? "__none__" } : {};
  return prisma.vendorBill.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 });
}

export async function getBillForUser(id: string, user: User) {
  const bill = await prisma.vendorBill.findUnique({
    where: { id },
    include: {
      lines: true,
      journalEntry: { include: { items: true } },
      // Include each settlement's payment method so the UI can split Paid via Cash / Bank.
      allocations: { include: { payment: { include: { journal: { select: { type: true } } } } } },
    },
  });
  if (!bill) throw NotFound("Bill not found.");
  if (user.role === "CONTACT" && bill.vendorId !== user.contactId) {
    throw NotFound("Bill not found.");
  }
  return bill;
}

// Edit a DRAFT bill's header (vendor reference / due date). Locked once confirmed.
export async function updateBill(id: string, input: UpdateBillInput) {
  const bill = await prisma.vendorBill.findUnique({ where: { id } });
  if (!bill) throw NotFound("Bill not found.");
  if (bill.state !== "DRAFT") throw Conflict("Only a draft bill can be edited.");
  return prisma.vendorBill.update({
    where: { id },
    data: { reference: input.reference, dueDate: input.dueDate },
    include: {
      lines: true,
      journalEntry: { include: { items: true } },
      allocations: { include: { payment: { include: { journal: { select: { type: true } } } } } },
    },
  });
}

// Confirm a draft bill: posts the balanced journal entry (Dr Purchase Expense / Cr Creditors)
// through postEntry() inside a single transaction. DRAFT-only (no double post).
export async function confirmBill(id: string, userId?: string) {
  return prisma.$transaction(async (tx) => {
    const bill = await tx.vendorBill.findUnique({ where: { id }, include: { lines: true } });
    if (!bill) throw NotFound("Bill not found.");
    if (bill.state !== "DRAFT") throw Conflict("Only a draft bill can be confirmed.");
    if (bill.lines.length === 0) throw Unprocessable("EMPTY_BILL", "Bill has no lines.");

    // Non-blocking budget check computed while the bill is still DRAFT (excluded from achieved).
    const warnings = await checkBudgetWarnings(
      tx,
      bill.lines.map((l) => ({ analyticAccountId: l.analyticAccountId, lineTotal: l.lineTotal })),
      bill.billDate,
    );

    const creditors = await tx.account.findUniqueOrThrow({ where: { name: "Creditors A/c" } });
    const purchaseJournal = await tx.journal.findFirstOrThrow({ where: { type: "PURCHASE" } });
    const total = round2(bill.amountTotal);

    // Debit each expense account by its share; credit Creditors for the total.
    const debitByAccount = new Map<string, ReturnType<typeof money>>();
    for (const l of bill.lines) {
      debitByAccount.set(
        l.accountId,
        (debitByAccount.get(l.accountId) ?? money(0)).plus(l.lineTotal),
      );
    }
    const lines = [
      ...[...debitByAccount].map(([accountId, amt]) => ({
        accountId,
        debit: round2(amt),
        partnerId: bill.vendorId,
        label: `Bill ${bill.number}`,
      })),
      { accountId: creditors.id, credit: total, partnerId: bill.vendorId, label: `Bill ${bill.number}` },
    ];

    const entry = await postEntry(
      {
        journalId: purchaseJournal.id,
        date: bill.billDate,
        sourceType: "BILL",
        sourceId: bill.id,
        reference: bill.number,
        partnerId: bill.vendorId,
        createdById: userId ?? null,
        number: bill.number, // JE number mirrors the bill number (per mockup)
        lines,
      },
      tx,
    );

    const updated = await tx.vendorBill.update({
      where: { id },
      data: { state: "CONFIRMED", journalEntryId: entry.id },
      include: { lines: true },
    });
    return { bill: updated, entry, warnings };
  });
}
