import { describe, it, expect } from "vitest";
import { assertBalanced, PostingError } from "@/server/services/posting.service";

const A = "acc-a";
const B = "acc-b";

describe("assertBalanced (double-entry invariants)", () => {
  it("accepts a balanced two-line entry", () => {
    const { totalDebit, totalCredit } = assertBalanced([
      { accountId: A, debit: 100 },
      { accountId: B, credit: 100 },
    ]);
    expect(totalDebit.equals(100)).toBe(true);
    expect(totalCredit.equals(100)).toBe(true);
  });

  it("rejects an unbalanced entry", () => {
    expect(() =>
      assertBalanced([
        { accountId: A, debit: 100 },
        { accountId: B, credit: 90 },
      ]),
    ).toThrowError(PostingError);
  });

  it("rejects a line with both debit and credit", () => {
    expect(() =>
      assertBalanced([
        { accountId: A, debit: 100, credit: 100 },
        { accountId: B, credit: 100 },
      ]),
    ).toThrowError(/both a debit and a credit/);
  });

  it("rejects a zero (empty) line", () => {
    expect(() =>
      assertBalanced([
        { accountId: A, debit: 0, credit: 0 },
        { accountId: B, credit: 0 },
      ]),
    ).toThrowError(PostingError);
  });

  it("rejects a single-line entry", () => {
    expect(() => assertBalanced([{ accountId: A, debit: 100 }])).toThrowError(PostingError);
  });
});
