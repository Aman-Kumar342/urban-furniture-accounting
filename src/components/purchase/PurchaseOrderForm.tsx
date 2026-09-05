"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { DocumentLineEditor } from "@/components/documents/DocumentLineEditor";
import { apiFetch, ApiRequestError } from "@/lib/api";
import { newEditorLine, parseScaled, type EditorLine } from "@/lib/documents";
import type { Contact } from "@/lib/contacts";
import type { Product } from "@/lib/products";
import type { AnalyticAccount } from "@/lib/analyticAccounts";
import type { PurchaseOrderDetail } from "@/lib/purchaseOrders";

const today = () => new Date().toISOString().slice(0, 10);

export function PurchaseOrderForm() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Contact[] | null>(null);
  const [products, setProducts] = useState<Product[] | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticAccount[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const [vendorId, setVendorId] = useState("");
  const [orderDate, setOrderDate] = useState(today());
  const [lines, setLines] = useState<EditorLine[]>(() => [newEditorLine()]);

  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function loadRefs() {
    setLoadError(false);
    try {
      const [c, p, a] = await Promise.all([
        apiFetch<{ contacts: Contact[] }>("/api/contacts"),
        apiFetch<{ products: Product[] }>("/api/products"),
        apiFetch<{ analyticAccounts: AnalyticAccount[] }>("/api/analytic-accounts"),
      ]);
      // Vendors = contacts that can be a vendor (VENDOR or BOTH).
      setVendors(c.contacts.filter((x) => x.type === "VENDOR" || x.type === "BOTH"));
      setProducts(p.products);
      setAnalytics(a.analyticAccounts);
    } catch {
      setLoadError(true);
    }
  }

  useEffect(() => {
    loadRefs();
  }, []);

  const linesValid = lines.every((l) => {
    if (!l.productId) return false;
    const q = parseScaled(l.quantity, 3);
    const u = parseScaled(l.unitPrice, 2);
    return q !== null && q > 0 && u !== null;
  });
  const canSave = !!vendorId && lines.length >= 1 && linesValid;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setFormError(null);
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = {
        vendorId,
        orderDate,
        lines: lines.map((l) => ({
          productId: l.productId,
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice || 0),
          ...(l.analyticAccountId ? { analyticAccountId: l.analyticAccountId } : {}),
        })),
      };
      const res = await apiFetch<{ purchaseOrder: PurchaseOrderDetail }>("/api/purchase-orders", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      router.push(`/purchase-orders/${res.purchaseOrder.id}`);
    } catch (err) {
      setSaving(false);
      if (err instanceof ApiRequestError) {
        if (err.code === "NOT_FOUND") setFormError(err.message);
        else if (err.code === "VALIDATION") setFormError("Check the vendor and each line (product, quantity, price).");
        else if (err.code === "FORBIDDEN") setFormError("You don't have permission to create purchase orders.");
        else setFormError(err.message);
      } else {
        setFormError("Can't reach the server. Check your connection and try again.");
      }
    }
  }

  if (loadError) {
    return (
      <div className="rounded-lg border border-line bg-surface p-8 text-center">
        <p className="text-sm text-oxblood">Couldn&rsquo;t load vendors and products.</p>
        <Button variant="ghost" onClick={loadRefs} className="mt-4 h-9 px-3 text-sm">
          Try again
        </Button>
      </div>
    );
  }
  if (!vendors || !products || !analytics) return <FormSkeleton />;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {formError && (
        <div role="alert" className="rounded-md border-l-2 border-oxblood bg-oxblood/5 px-3 py-2 text-sm text-oxblood">
          {formError}
        </div>
      )}
      {(products.length === 0 || vendors.length === 0) && (
        <div className="rounded-md border-l-2 border-amber bg-amber/10 px-3 py-2 text-sm text-amber">
          {vendors.length === 0 ? "Add a vendor contact " : ""}
          {vendors.length === 0 && products.length === 0 ? "and " : ""}
          {products.length === 0 ? "add a product " : ""}
          before creating a purchase order.
        </div>
      )}

      <div className="grid gap-4 rounded-lg border border-line bg-surface p-6 sm:grid-cols-2">
        <FormField label="Vendor" htmlFor="vendor" error={submitted && !vendorId ? "Choose a vendor." : undefined}>
          <Select id="vendor" value={vendorId} onChange={(e) => setVendorId(e.target.value)} invalid={submitted && !vendorId}>
            <option value="">Select a vendor</option>
            {vendors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField label="Order date" htmlFor="orderDate">
          <Input id="orderDate" type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
        </FormField>
      </div>

      <DocumentLineEditor lines={lines} onChange={setLines} products={products} analytics={analytics} priceField="cost" showLineErrors={submitted} />

      <div className="flex items-center gap-3">
        <Button type="submit" loading={saving} disabled={submitted && !canSave}>
          Create purchase order
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/purchase-orders")}>
          Cancel
        </Button>
        {submitted && !canSave && <span className="text-sm text-oxblood">Add a vendor and complete every line.</span>}
      </div>
    </form>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-lg border border-line bg-surface p-6 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-11 rounded-md bg-line/40" />
        ))}
      </div>
      <div className="h-40 rounded-lg border border-line bg-surface" />
    </div>
  );
}
