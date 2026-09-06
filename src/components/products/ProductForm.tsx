"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { PRODUCT_TYPES, type Product, type ProductType } from "@/lib/products";

type Values = { name: string; type: ProductType; category: string; salesPrice: string; cost: string; imageUrl: string | null };
type Errors = Partial<Record<keyof Values, string>> & { form?: string };

function fromProduct(p?: Product): Values {
  return {
    name: p?.name ?? "",
    type: p?.type ?? "GOODS",
    category: p?.category?.name ?? "",
    salesPrice: p?.salesPrice ?? "",
    cost: p?.cost ?? "",
    imageUrl: p?.imageUrl ?? null,
  };
}

// Empty -> 0 (the schema default); otherwise a finite, non-negative number. Returns null when invalid.
function parsePrice(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return 0;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function ProductForm({ product }: { product?: Product }) {
  const router = useRouter();
  const editing = !!product;
  const [values, setValues] = useState<Values>(() => fromProduct(product));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [categoryNames, setCategoryNames] = useState<string[]>([]);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [archiving, setArchiving] = useState(false);

  // Best-effort suggestions for the create-on-fly category field, from categories already in use.
  // No dedicated category endpoint exists; this reuses GET /api/products and degrades to free text.
  useEffect(() => {
    let alive = true;
    apiFetch<{ products: Product[] }>("/api/products")
      .then((r) => {
        if (!alive) return;
        const names = Array.from(new Set(r.products.map((p) => p.category?.name).filter(Boolean))) as string[];
        setCategoryNames(names.sort((a, b) => a.localeCompare(b)));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    setSaved(false);
  };

  function applyError(err: unknown) {
    if (err instanceof ApiRequestError) {
      if (err.code === "VALIDATION" && err.details && typeof err.details === "object") {
        const d = err.details as Record<string, string[] | undefined>;
        const next: Errors = {};
        if (d.name?.[0]) next.name = d.name[0];
        if (d.salesPrice?.[0]) next.salesPrice = d.salesPrice[0];
        if (d.cost?.[0]) next.cost = d.cost[0];
        if (d.categoryName?.[0]) next.category = d.categoryName[0];
        setErrors(Object.keys(next).length ? next : { form: "Please check the highlighted fields." });
      } else if (err.code === "NOT_FOUND") {
        setErrors({ category: err.message });
      } else if (err.code === "FORBIDDEN") {
        setErrors({ form: "You don't have permission to do that." });
      } else {
        setErrors({ form: err.message });
      }
    } else {
      setErrors({ form: "Can't reach the server. Check your connection and try again." });
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (!values.name.trim()) next.name = "Enter a product name.";
    const sales = parsePrice(values.salesPrice);
    const cost = parsePrice(values.cost);
    if (sales === null) next.salesPrice = "Enter a valid amount (0 or more).";
    if (cost === null) next.cost = "Enter a valid amount (0 or more).";
    setErrors(next);
    if (Object.keys(next).length) return;

    const payload: Record<string, unknown> = {
      name: values.name.trim(),
      type: values.type,
      salesPrice: sales,
      cost,
    };
    if (values.category.trim()) payload.categoryName = values.category.trim();
    if (editing) payload.imageUrl = values.imageUrl; // string sets, null clears
    else if (values.imageUrl) payload.imageUrl = values.imageUrl;

    setSaving(true);
    try {
      if (editing) {
        await apiFetch(`/api/products/${product!.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        setSaved(true);
        router.refresh();
      } else {
        const res = await apiFetch<{ product: Product }>("/api/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        router.push(`/products/${res.product.id}`);
        return;
      }
    } catch (err) {
      applyError(err);
    } finally {
      setSaving(false);
    }
  }

  async function archive() {
    setArchiving(true);
    try {
      await apiFetch(`/api/products/${product!.id}/archive`, { method: "POST", body: "{}" });
      router.push("/products");
      router.refresh();
    } catch (err) {
      setConfirmArchive(false);
      applyError(err);
      setArchiving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {errors.form && (
        <div role="alert" className="rounded-md border-l-2 border-oxblood bg-oxblood/5 px-3 py-2 text-sm text-oxblood">
          {errors.form}
        </div>
      )}
      {saved && (
        <div role="status" className="rounded-md border-l-2 border-income bg-income/5 px-3 py-2 text-sm text-income">
          Changes saved.
        </div>
      )}

      <div className="space-y-5 rounded-lg border border-line bg-surface p-6">
        <ImageUpload
          name={values.name || "?"}
          value={values.imageUrl}
          shape="square"
          fallback="box"
          onChange={(v) => {
            setValues((prev) => ({ ...prev, imageUrl: v }));
            setSaved(false);
          }}
        />
        <FormField label="Product name" htmlFor="name" error={errors.name}>
          <Input id="name" autoFocus value={values.name} onChange={set("name")} invalid={!!errors.name} />
        </FormField>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Type" htmlFor="type" error={errors.type}>
            <Select id="type" value={values.type} onChange={set("type")}>
              {PRODUCT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Category" htmlFor="category" error={errors.category} hint="Type a new category to create it on the fly.">
            <Input
              id="category"
              list="uf-category-suggestions"
              value={values.category}
              onChange={set("category")}
              invalid={!!errors.category}
              placeholder="e.g. Electronics"
            />
            <datalist id="uf-category-suggestions">
              {categoryNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </FormField>
          <FormField label="Sales price" htmlFor="salesPrice" error={errors.salesPrice}>
            <Input
              id="salesPrice"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              className="tnum text-right"
              value={values.salesPrice}
              onChange={set("salesPrice")}
              invalid={!!errors.salesPrice}
              placeholder="0.00"
            />
          </FormField>
          <FormField label="Cost" htmlFor="cost" error={errors.cost} hint="Purchase price.">
            <Input
              id="cost"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              className="tnum text-right"
              value={values.cost}
              onChange={set("cost")}
              invalid={!!errors.cost}
              placeholder="0.00"
            />
          </FormField>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" loading={saving}>
          {editing ? "Save changes" : "Create product"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(editing ? `/products/${product!.id}` : "/products")}
        >
          Cancel
        </Button>
      </div>

      {editing && (
        <div className="rounded-lg border border-line bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">Archive product</p>
              <p className="text-sm text-muted">
                Hides it from lists and pickers. Existing orders, invoices, and bills keep their link.
              </p>
            </div>
            {confirmArchive ? (
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={() => setConfirmArchive(false)} disabled={archiving}>
                  Cancel
                </Button>
                <button
                  type="button"
                  onClick={archive}
                  disabled={archiving}
                  className="inline-flex h-11 items-center rounded-md bg-oxblood px-4 text-sm font-medium text-paper transition-colors hover:bg-oxblood/90 disabled:opacity-60"
                >
                  {archiving ? "Archiving…" : "Confirm archive"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmArchive(true)}
                className="inline-flex h-11 items-center rounded-md border border-oxblood/40 px-4 text-sm font-medium text-oxblood transition-colors hover:bg-oxblood/5"
              >
                Archive
              </button>
            )}
          </div>
        </div>
      )}
    </form>
  );
}
