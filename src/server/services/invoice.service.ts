import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { money, round2 } from "@/lib/money";
import { NotFound, Conflict, Unprocessable } from "@/lib/errors";
import { postEntry } from "./posting.service";

export function listInvoices(user: User) {
  // Contact-portal users see only their own invoices (server-side ownership).
  const where = user.role === "CONTACT" ? { customerId: user.contactId ?? "__none__" } : {};
  return prisma.customerInvoice.findMany({ where, orderBy: { createdAt: "desc" }, take: 100 });
}

export async function getInvoiceForUser(id: string, user: User) {
  const inv = await prisma.customerInvoice.findUnique({
    where: { id },
    include: {
      lines: true,
      journalEntry: { include: { items: true } },
      allocations: true,
    },
  });
  if (!inv) throw NotFound("Invoice not found.");
  // Ownership: a Contact cannot read another contact's invoice (return 404, not 403).
  if (user.role === "CONTACT" && inv.customerId !== user.contactId) {
    throw NotFound("Invoice not found.");
  }
  return inv;
}

// Confirm a draft invoice: posts the balanced journal entry (Dr Debtors / Cr Sales Income)
// through postEntry() inside a single transaction. Idempotent guard: DRAFT only.
export async function confirmInvoice(id: string, userId?: string) {
  return prisma.$transaction(async (tx) => {
    const inv = await tx.customerInvoice.findUnique({ where: { id }, include: { lines: true } });
    if (!inv) throw NotFound("Invoice not found.");
    if (inv.state !== "DRAFT") throw Conflict("Only a draft invoice can be confirmed.");
    if (inv.lines.length === 0) throw Unprocessable("EMPTY_INVOICE", "Invoice has no lines.");

    const debtors = await tx.account.findUniqueOrThrow({ where: { name: "Debtors A/c" } });
    const salesJournal = await tx.journal.findFirstOrThrow({ where: { type: "SALES" } });
    const total = round2(inv.amountTotal);

    // Credit each income account by its share; debit Debtors for the total.
    const creditByAccount = new Map<string, ReturnType<typeof money>>();
    for (const l of inv.lines) {
      creditByAccount.set(
        l.accountId,
        (creditByAccount.get(l.accountId) ?? money(0)).plus(l.lineTotal),
      );
    }
    const lines = [
      { accountId: debtors.id, debit: total, partnerId: inv.customerId, label: `Invoice ${inv.number}` },
      ...[...creditByAccount].map(([accountId, amt]) => ({
        accountId,
        credit: round2(amt),
        partnerId: inv.customerId,
        label: `Invoice ${inv.number}`,
      })),
    ];

    const entry = await postEntry(
      {
        journalId: salesJournal.id,
        date: inv.invoiceDate,
        sourceType: "INVOICE",
        sourceId: inv.id,
        reference: inv.number,
        partnerId: inv.customerId,
        createdById: userId ?? null,
        number: inv.number, // JE number mirrors the invoice number (per mockup)
        lines,
      },
      tx,
    );

    const invoice = await tx.customerInvoice.update({
      where: { id },
      data: { state: "CONFIRMED", journalEntryId: entry.id },
      include: { lines: true },
    });
    return { invoice, entry };
  });
}
