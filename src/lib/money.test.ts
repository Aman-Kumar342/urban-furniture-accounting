import { describe, it, expect } from "vitest";
import { money, round2, sum } from "@/lib/money";

describe("money", () => {
  it("adds exactly (no float error)", () => {
    expect(sum(["0.1", "0.2"]).equals("0.3")).toBe(true);
  });

  it("rounds half-up to 2 decimals", () => {
    expect(round2("2.345").equals("2.35")).toBe(true);
  });

  it("treats a zero default as zero", () => {
    expect(money().isZero()).toBe(true);
  });
});
