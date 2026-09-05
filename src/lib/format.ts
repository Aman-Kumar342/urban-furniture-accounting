// Client-safe money formatting. The API returns Decimal(14,2) values as strings; we format them
// for display WITHOUT any floating-point arithmetic — pure string work — so precision is never lost.
export function formatMoney(value: string | number): string {
  const s = typeof value === "number" ? value.toString() : value;
  if (s == null || s === "") return "0.00";
  const neg = s.trim().startsWith("-");
  const abs = neg ? s.trim().slice(1) : s.trim();
  const [intRaw, decRaw = ""] = abs.split(".");
  const intPart = (intRaw || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const decPart = (decRaw + "00").slice(0, 2);
  return `${neg ? "-" : ""}${intPart}.${decPart}`;
}
