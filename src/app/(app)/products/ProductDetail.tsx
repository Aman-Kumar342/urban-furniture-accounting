"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { ProductForm } from "@/components/products/ProductForm";
import type { Product } from "@/lib/products";

export function ProductDetail({ id }: { id: string }) {
  const [product, setProduct] = useState<Product | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "notfound" | "ready">("loading");

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await apiFetch<{ product: Product }>(`/api/products/${id}`);
      setProduct(res.product);
      setStatus("ready");
    } catch (e) {
      setStatus(e instanceof ApiRequestError && e.code === "NOT_FOUND" ? "notfound" : "error");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (status === "loading") return <DetailSkeleton />;

  if (status === "notfound") {
    return (
      <Panel>
        <p className="font-display text-lg text-ink">Product not found</p>
        <p className="mt-1 text-sm text-muted">It may have been archived or the link is out of date.</p>
        <Link href="/products" className="mt-5 inline-block">
          <Button variant="ghost">Back to products</Button>
        </Link>
      </Panel>
    );
  }

  if (status === "error" || !product) {
    return (
      <Panel>
        <p className="text-sm text-oxblood">Couldn&rsquo;t load this product.</p>
        <Button variant="ghost" onClick={load} className="mt-4 h-9 px-3 text-sm">
          Try again
        </Button>
      </Panel>
    );
  }

  return <ProductForm product={product} />;
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-line bg-surface px-6 py-12 text-center">{children}</div>;
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-5 rounded-lg border border-line bg-surface p-6">
        <div className="h-11 rounded-md bg-line/40" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-11 rounded-md bg-line/40" />
          ))}
        </div>
      </div>
      <div className="h-11 w-40 rounded-md bg-line/40" />
    </div>
  );
}
