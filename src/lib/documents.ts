// Shared helpers for document line editors (Sales Orders now; Purchase Orders reuse this).
// All math here is integer-scaled (no floats) and is DISPLAY-ONLY feedback — the backend
// computes the authoritative lineTotal/amountTotal.

export interface EditorLine {
  key: string;
  productId: string;
  analyticAccountId: string;
  quantity: string;
  unitPrice: string;
}

export const newEditorLine = (): EditorLine => ({
  key: Math.random().toString(36).slice(2),
  productId: "",
  analyticAccountId: "",
  quantity: "1",
  unitPrice: "",
});

// Parse a non-negative decimal string to an integer scaled by 10^places. "" -> 0; invalid -> null.
export function parseScaled(raw: string, places: number): number | null {
  const t = raw.trim();
  if (t === "") return 0;
  const re = new RegExp(`^\\d+(\\.\\d{1,${places}})?$`);
  if (!re.test(t)) return null;
  const [i, d = ""] = t.split(".");
  return parseInt(i, 10) * 10 ** places + parseInt((d + "0".repeat(places)).slice(0, places), 10);
}

// quantity has 3 decimals, unit price 2 -> line total in integer cents. null if either is invalid.
export function lineTotalCents(quantity: string, unitPrice: string): number | null {
  const qi = parseScaled(quantity, 3); // qty * 1000
  const pc = parseScaled(unitPrice, 2); // price * 100
  if (qi === null || pc === null) return null;
  return Math.round((qi * pc) / 1000); // = qty * price * 100 (cents)
}

// Integer cents -> "12345.67" style string for formatMoney. No float arithmetic.
export function centsToDecimal(cents: number): string {
  const neg = cents < 0;
  const a = Math.abs(cents);
  return `${neg ? "-" : ""}${Math.floor(a / 100)}.${String(a % 100).padStart(2, "0")}`;
}
