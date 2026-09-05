import crypto from "crypto";
import { Prisma } from "@prisma/client";

export type SequenceKey = "SO" | "PO" | "INV" | "BILL" | "PAY" | "JE";

// Year-scoped sequences reset per year; the rest use year 0 (non-year-scoped).
const YEAR_SCOPED: Record<SequenceKey, boolean> = {
  SO: false,
  PO: false,
  INV: true,
  BILL: true,
  PAY: true,
  JE: true,
};

function format(key: SequenceKey, year: number, n: number): string {
  const pad = (v: number, w: number) => String(v).padStart(w, "0");
  switch (key) {
    case "SO":
      return `SO${pad(n, 5)}`;
    case "PO":
      return `PO${pad(n, 5)}`;
    case "INV":
      return `Inv/${year}/${pad(n, 3)}`;
    case "BILL":
      return `Bill/${year}/${pad(n, 4)}`;
    case "PAY":
      return `PAY/${year}/${pad(n, 3)}`;
    case "JE":
      return `JE/${year}/${pad(n, 4)}`;
  }
}

/**
 * Allocate the next human-readable document number. Concurrency-safe: the atomic
 * INSERT ... ON CONFLICT DO UPDATE increments under a row lock, so simultaneous callers
 * never collide. Must run inside the same transaction as the document it numbers.
 */
export async function nextNumber(
  tx: Prisma.TransactionClient,
  key: SequenceKey,
  year?: number,
): Promise<string> {
  const y = YEAR_SCOPED[key] ? (year ?? new Date().getFullYear()) : 0;
  const id = crypto.randomUUID();
  const rows = await tx.$queryRaw<{ nextValue: number }[]>(Prisma.sql`
    INSERT INTO "NumberSequence" ("id", "key", "year", "nextValue")
    VALUES (${id}, ${key}, ${y}, 2)
    ON CONFLICT ("key", "year")
    DO UPDATE SET "nextValue" = "NumberSequence"."nextValue" + 1
    RETURNING "nextValue"
  `);
  const allocated = rows[0].nextValue - 1;
  return format(key, y, allocated);
}
