import { Prisma, type AccountType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/money";

export interface AccountBalanceRow {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
}

/**
 * Per-account debit/credit totals over POSTED journal items whose entry date is within
 * [start, end] (inclusive). One grouped aggregation — no per-row work, no N+1. Draft and
 * cancelled entries are excluded; accounts with no activity return zeros.
 * `start`/`end` are 'YYYY-MM-DD' strings (date-only, timezone-safe via ::date).
 */
export async function getAccountBalances(
  start: string,
  end: string,
): Promise<AccountBalanceRow[]> {
  const rows = await prisma.$queryRaw<
    { id: string; code: string; name: string; type: AccountType; debit: string; credit: string }[]
  >(Prisma.sql`
    SELECT
      a.id,
      a.code,
      a.name,
      a.type::text AS type,
      COALESCE(SUM(CASE WHEN je.state = 'POSTED' AND je.date >= ${start}::date AND je.date <= ${end}::date THEN ji.debit ELSE 0 END), 0)::text AS debit,
      COALESCE(SUM(CASE WHEN je.state = 'POSTED' AND je.date >= ${start}::date AND je.date <= ${end}::date THEN ji.credit ELSE 0 END), 0)::text AS credit
    FROM "Account" a
    LEFT JOIN "JournalItem" ji ON ji."accountId" = a.id
    LEFT JOIN "JournalEntry" je ON je.id = ji."entryId"
    WHERE a."isArchived" = false
    GROUP BY a.id, a.code, a.name, a.type
    ORDER BY a.code
  `);
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    name: r.name,
    type: r.type,
    debit: money(r.debit),
    credit: money(r.credit),
  }));
}
