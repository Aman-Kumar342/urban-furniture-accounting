"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { useView } from "@/lib/useView";
import { formatMoney } from "@/lib/format";
import {
  PRODUCT_TYPES,
  PRODUCT_TYPE_LABEL,
  PRODUCT_TYPE_TONE,
  type Product,
  type ProductType,
} from "@/lib/products";

export function ProductsList() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | ProductType>("ALL");
  const [view, setView] = useView("view.products");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ products: Product[] }>("/api/products");
      setProducts(res.products);
    } catch (e) {
      setError(
        e instanceof ApiRequestError && e.code === "FORBIDDEN"
          ? "You don't have access to products."
          : "Couldn't load products. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!products) return [];
    const needle = q.trim().toLowerCase();
    return products.filter((p) => {
      if (typeFilter !== "ALL" && p.type !== typeFilter) return false;
      if (!needle) return true;
      return [p.name, p.category?.name].filter(Boolean).some((v) => v!.toLowerCase().includes(needle));
    });
  }, [products, q, typeFilter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full max-w-xs sm:w-64">
            <Input
              type="search"
              placeholder="Search name or category…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search products"
            />
          </div>
          <div className="w-40">
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as "ALL" | ProductType)} aria-label="Filter by type">
              <option value="ALL">All types</option>
              {PRODUCT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle value={view} onChange={setView} />
          <Link href="/products/new">
            <Button>New product</Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <ListSkeleton />
      ) : error ? (
        <div className="rounded-lg border border-line bg-surface p-8 text-center">
          <p className="text-sm text-oxblood">{error}</p>
          <Button variant="ghost" onClick={load} className="mt-4 h-9 px-3 text-sm">
            Try again
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState hasFilter={q.trim().length > 0 || typeFilter !== "ALL"} />
      ) : view === "kanban" ? (
        <ProductKanban products={filtered} total={products?.length ?? 0} filtered={filtered.length !== (products?.length ?? 0)} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium text-muted">
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 text-right font-medium">Sales price</th>
                  <th className="px-4 py-3 text-right font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/products/${p.id}`)}
                    className="cursor-pointer border-b border-line last:border-0 transition-colors hover:bg-paper/60"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={p.name} imageUrl={p.imageUrl} size="sm" shape="square" fallback="box" />
                        <Link
                          href={`/products/${p.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium text-ink hover:text-pine hover:underline"
                        >
                          {p.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {p.category?.name || <span className="text-line">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={PRODUCT_TYPE_TONE[p.type]}>{PRODUCT_TYPE_LABEL[p.type]}</Badge>
                    </td>
                    <td className="px-4 py-3 tnum text-right text-ink">{formatMoney(p.salesPrice)}</td>
                    <td className="px-4 py-3 tnum text-right text-muted">{formatMoney(p.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-4 py-2.5 text-xs text-muted">
            {filtered.length} {filtered.length === 1 ? "product" : "products"}
            {products && filtered.length !== products.length ? ` of ${products.length}` : ""}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductKanban({ products, total, filtered }: { products: Product[]; total: number; filtered: boolean }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((p) => (
          <Link
            key={p.id}
            href={`/products/${p.id}`}
            className="rounded-lg border border-line bg-surface p-4 transition-colors hover:border-pine/40 hover:bg-paper/40"
          >
            <div className="flex items-start gap-3">
              <Avatar name={p.name} imageUrl={p.imageUrl} size="md" shape="square" fallback="box" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-medium text-ink">{p.name}</p>
                  <Badge tone={PRODUCT_TYPE_TONE[p.type]}>{PRODUCT_TYPE_LABEL[p.type]}</Badge>
                </div>
                <p className="mt-0.5 truncate text-sm text-muted">{p.category?.name || "Uncategorised"}</p>
                <div className="mt-2 flex items-baseline justify-between gap-3">
                  <span className="tnum text-sm font-medium text-ink">{formatMoney(p.salesPrice)}</span>
                  <span className="tnum text-xs text-muted">cost {formatMoney(p.cost)}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <p className="text-xs text-muted">
        {products.length} {products.length === 1 ? "product" : "products"}
        {filtered ? ` of ${total}` : ""}
      </p>
    </div>
  );
}

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-surface px-6 py-14 text-center">
      {hasFilter ? (
        <p className="text-sm text-muted">No products match your search.</p>
      ) : (
        <>
          <p className="font-display text-lg text-ink">No products yet</p>
          <p className="mt-1 text-sm text-muted">Add goods and services to use them on orders, invoices, and bills.</p>
          <Link href="/products/new" className="mt-5 inline-block">
            <Button>New product</Button>
          </Link>
        </>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="border-b border-line px-4 py-3">
        <div className="h-3 w-40 rounded bg-line/50" />
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-4 border-b border-line px-4 py-3.5 last:border-0">
          <div className="h-3 w-44 rounded bg-line/50" />
          <div className="ml-auto h-3 w-16 rounded bg-line/40" />
          <div className="h-3 w-16 rounded bg-line/40" />
        </div>
      ))}
    </div>
  );
}
