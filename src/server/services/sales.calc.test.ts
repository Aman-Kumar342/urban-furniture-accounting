import { describe, it, expect } from "vitest";
import { money } from "@/lib/money";
import { computeLineTotal, deriveStatus, assertPayable } from "@/server/services/sales.calc";
import { AppError } from "@/lib/errors";
import { createSalesOrderSchema, createPaymentSchema } from "@/server/validation/sales";

describe("sales.calc", () => {
  it("computes line total (qty * price)", () => {
    expect(computeLineTotal(3, 2000).equals(6000)).toBe(true);
  });

  it("derives payment status", () => {
    expect(deriveStatus(money(100), money(0))).toBe("NOT_PAID");
    expect(deriveStatus(money(100), money(40))).toBe("PARTIAL");
    expect(deriveStatus(money(100), money(100))).toBe("PAID");
  });

  it("allows exact settlement, rejects overpayment and non-positive amounts", () => {
    expect(() => assertPayable(money(100), money(100))).not.toThrow();
    expect(() => assertPayable(money(120), money(100))).toThrowError(AppError);
    expect(() => assertPayable(money(0), money(100))).toThrowError(AppError);
  });
});

describe("sales validation schemas", () => {
  const base = { customerId: crypto.randomUUID(), lines: [{ productId: crypto.randomUUID(), quantity: 1, unitPrice: 10 }] };

  it("rejects quantity <= 0", () => {
    expect(
      createSalesOrderSchema.safeParse({ ...base, lines: [{ ...base.lines[0], quantity: 0 }] }).success,
    ).toBe(false);
  });

  it("rejects negative price", () => {
    expect(
      createSalesOrderSchema.safeParse({ ...base, lines: [{ ...base.lines[0], unitPrice: -5 }] }).success,
    ).toBe(false);
  });

  it("rejects non-positive payment amount", () => {
    expect(
      createPaymentSchema.safeParse({ invoiceId: crypto.randomUUID(), method: "BANK", amount: 0 }).success,
    ).toBe(false);
  });

  it("payment requires exactly one of invoiceId / billId", () => {
    const id = crypto.randomUUID();
    expect(createPaymentSchema.safeParse({ invoiceId: id, method: "BANK", amount: 10 }).success).toBe(true);
    expect(createPaymentSchema.safeParse({ billId: id, method: "BANK", amount: 10 }).success).toBe(true);
    expect(createPaymentSchema.safeParse({ invoiceId: id, billId: id, method: "BANK", amount: 10 }).success).toBe(false);
    expect(createPaymentSchema.safeParse({ method: "BANK", amount: 10 }).success).toBe(false);
  });
});
