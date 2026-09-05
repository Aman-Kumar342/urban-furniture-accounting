import { Prisma, type JournalEntry, type JournalItem, type SourceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { round2 } from "@/lib/money";
import { nextNumber, type SequenceKey } from "./numbering.service";

export class PostingError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "PostingError";
  }
}

export interface PostLine {
  accountId: string;
  debit?: Prisma.Decimal.Value; // default 0
  credit?: Prisma.Decimal.Value; // default 0
  partnerId?: string | null;
  analyticAccountId?: string | null;
  label?: string | null;
}

export interface PostEntryInput {
  journalId: string;
  date: Date;
  sourceType: SourceType;
  sourceId?: string | null;
  reference?: string | null;
  partnerId?: string | null;
  createdById?: string | null;
  /** Explicit entry number (e.g. an invoice/bill number). If omitted, one is allocated. */
  number?: string;
  /** Sequence to allocate from when `number` is omitted (default "JE"). */
  numberKey?: SequenceKey;
  numberYear?: number;
  lines: PostLine[];
}

export type PostedEntry = JournalEntry & { items: JournalItem[] };

/**
 * Pure validation of the double-entry invariants (INV-1, INV-2). Throws PostingError.
 * Returns the balanced totals. No DB access — unit-testable.
 */
export function assertBalanced(lines: PostLine[]): {
  totalDebit: Prisma.Decimal;
  totalCredit: Prisma.Decimal;
} {
  if (lines.length < 2) {
    throw new PostingError("UNBALANCED", 422, "A journal entry needs at least two lines.");
  }
  let totalDebit = round2(0);
  let totalCredit = round2(0);
  for (const line of lines) {
    const d = round2(line.debit ?? 0);
    const c = round2(line.credit ?? 0);
    if (d.isNegative() || c.isNegative()) {
      throw new PostingError("INVALID_LINE", 422, "Debit and credit must be >= 0.");
    }
    if (!d.isZero() && !c.isZero()) {
      throw new PostingError("INVALID_LINE", 422, "A line cannot have both a debit and a credit.");
    }
    if (d.isZero() && c.isZero()) {
      throw new PostingError("INVALID_LINE", 422, "A line must have a non-zero debit or credit.");
    }
    totalDebit = totalDebit.plus(d);
    totalCredit = totalCredit.plus(c);
  }
  if (!totalDebit.equals(totalCredit)) {
    throw new PostingError(
      "UNBALANCED",
      422,
      `Entry is not balanced: debit ${totalDebit} != credit ${totalCredit}.`,
    );
  }
  if (totalDebit.isZero()) {
    throw new PostingError("UNBALANCED", 422, "Entry total must be greater than zero.");
  }
  return { totalDebit, totalCredit };
}

/**
 * THE single sanctioned path to create a POSTED journal entry. Validates the balanced
 * invariant, then atomically: allocates a number, inserts the entry as DRAFT with its
 * items, and flips it to POSTED (the DB balance trigger validates on that transition).
 * Callers must NEVER create a POSTED JournalEntry directly — the DB also blocks a direct
 * POSTED insert, so this is the only way in.
 */
async function postEntryCore(
  tx: Prisma.TransactionClient,
  input: PostEntryInput,
  totalDebit: Prisma.Decimal,
): Promise<PostedEntry> {
  const number =
    input.number ?? (await nextNumber(tx, input.numberKey ?? "JE", input.numberYear));

  const draft = await tx.journalEntry.create({
    data: {
      number,
      journalId: input.journalId,
      date: input.date,
      reference: input.reference ?? null,
      sourceType: input.sourceType,
      sourceId: input.sourceId ?? null,
      partnerId: input.partnerId ?? null,
      createdById: input.createdById ?? null,
      state: "DRAFT",
      amount: round2(0),
      items: {
        create: input.lines.map((l) => ({
          accountId: l.accountId,
          debit: round2(l.debit ?? 0),
          credit: round2(l.credit ?? 0),
          partnerId: l.partnerId ?? null,
          analyticAccountId: l.analyticAccountId ?? null,
          label: l.label ?? null,
        })),
      },
    },
  });

  return tx.journalEntry.update({
    where: { id: draft.id },
    data: { state: "POSTED", amount: totalDebit },
    include: { items: true },
  });
}

/**
 * The single sanctioned path to create a POSTED journal entry.
 *
 * Pass an existing `tx` (Prisma transaction client) to post INSIDE a caller's transaction
 * (e.g. a payment that must be atomic with its allocation and invoice update). When `tx` is
 * omitted, postEntry opens its own transaction. Either way it runs the same core, so the
 * balanced invariant has one enforcement path.
 */
export async function postEntry(
  input: PostEntryInput,
  tx?: Prisma.TransactionClient,
): Promise<PostedEntry> {
  const { totalDebit } = assertBalanced(input.lines);
  if (tx) return postEntryCore(tx, input, totalDebit);
  return prisma.$transaction((t) => postEntryCore(t, input, totalDebit));
}
