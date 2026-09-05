"use client";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatMoney } from "@/lib/format";
import { centsToDecimal, lineTotalCents, newEditorLine, type EditorLine } from "@/lib/documents";
import type { Product } from "@/lib/products";
import type { AnalyticAccount } from "@/lib/analyticAccounts";

interface Props {
  lines: EditorLine[];
  onChange: (lines: EditorLine[]) => void;
  products: Product[];
  analytics: AnalyticAccount[];
  // Which product price pre-fills unit price when a product is picked (sales -> salesPrice).
  priceField: "salesPrice" | "cost";
  showLineErrors?: boolean;
}

// Reusable ruled document-line grid: Product · Analytic · Qty · Unit price · Line total, with
// add/remove and a live (display-only) document total. Backend computes authoritative totals.
export function DocumentLineEditor({ lines, onChange, products, analytics, priceField, showLineErrors }: Props) {
  const productById = new Map(products.map((p) => [p.id, p]));

  const setLine = (key: string, patch: Partial<EditorLine>) =>
    onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const onProduct = (key: string, productId: string) => {
    const p = productById.get(productId);
    const line = lines.find((l) => l.key === key)!;
    // Pre-fill unit price from the product when the field is still empty.
    const unitPrice = line.unitPrice.trim() === "" && p ? String(p[priceField]) : line.unitPrice;
    setLine(key, { productId, unitPrice });
  };

  const addLine = () => onChange([...lines, newEditorLine()]);
  const removeLine = (key: string) => onChange(lines.length <= 1 ? lines : lines.filter((l) => l.key !== key));

  let totalCents = 0;
  let totalOk = true;

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs font-medium text-muted">
              <th className="px-3 py-2.5 font-medium">Product</th>
              <th className="px-3 py-2.5 font-medium">Analytic</th>
              <th className="px-3 py-2.5 text-right font-medium">Qty</th>
              <th className="px-3 py-2.5 text-right font-medium">Unit price</th>
              <th className="px-3 py-2.5 text-right font-medium">Line total</th>
              <th className="w-10 px-2 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const lc = lineTotalCents(l.quantity, l.unitPrice);
              if (lc === null) totalOk = false;
              else totalCents += lc;
              const badProduct = showLineErrors && !l.productId;
              const badAmounts = showLineErrors && lc === null;
              return (
                <tr key={l.key} className="border-b border-line last:border-0 align-top">
                  <td className="px-3 py-2">
                    <Select value={l.productId} onChange={(e) => onProduct(l.key, e.target.value)} invalid={badProduct}>
                      <option value="">Select product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Select value={l.analyticAccountId} onChange={(e) => setLine(l.key, { analyticAccountId: e.target.value })}>
                      <option value="">—</option>
                      {analytics.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.001"
                      inputMode="decimal"
                      className="tnum w-24 text-right"
                      value={l.quantity}
                      onChange={(e) => setLine(l.key, { quantity: e.target.value })}
                      invalid={badAmounts}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      className="tnum w-28 text-right"
                      placeholder="0.00"
                      value={l.unitPrice}
                      onChange={(e) => setLine(l.key, { unitPrice: e.target.value })}
                      invalid={badAmounts}
                    />
                  </td>
                  <td className="tnum px-3 py-2 text-right text-ink">
                    {lc === null ? <span className="text-oxblood">—</span> : formatMoney(centsToDecimal(lc))}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeLine(l.key)}
                      disabled={lines.length <= 1}
                      aria-label="Remove line"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted transition-colors hover:bg-line/60 hover:text-oxblood disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-line bg-paper/40 font-medium">
              <td className="px-3 py-3 text-muted" colSpan={4}>
                Total
              </td>
              <td className="tnum px-3 py-3 text-right text-ink">
                {totalOk ? formatMoney(centsToDecimal(totalCents)) : <span className="text-oxblood">—</span>}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="border-t border-line px-3 py-3">
        <button
          type="button"
          onClick={addLine}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-pine transition-colors hover:bg-pine/5"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Add line
        </button>
      </div>
    </div>
  );
}
