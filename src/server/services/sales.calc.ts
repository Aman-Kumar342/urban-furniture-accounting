import { Prisma } from "@prisma/client";
import { money, round2 } from "@/lib/money";
import { AppError } from "@/lib/errors";

// Pure sales/payment calculations — no DB, unit-testable.

export function computeLineTotal(quantity: number, unitPrice: number): Prisma.Decimal {
  return round2(money(quantity).times(unitPrice));
}

export function deriveStatus(
  total: Prisma.Decimal,
  paid: Prisma.Decimal,
): "NOT_PAID" | "PARTIAL" | "PAID" {
  if (paid.isZero()) return "NOT_PAID";
  if (paid.greaterThanOrEqualTo(total)) return "PAID";
  return "PARTIAL";
}

/** Guards a payment amount: must be > 0 and must not exceed the amount due (no overpayment). */
export function assertPayable(amount: Prisma.Decimal, amountDue: Prisma.Decimal): void {
  if (amount.lessThanOrEqualTo(0)) {
    throw new AppError("INVALID_AMOUNT", 422, "Payment amount must be greater than zero.");
  }
  if (amount.greaterThan(amountDue)) {
    throw new AppError("OVERPAYMENT", 422, `Payment ${amount} exceeds amount due ${amountDue}.`);
  }
}
