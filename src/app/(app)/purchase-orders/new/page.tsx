import Link from "next/link";
import { PurchaseOrderForm } from "@/components/purchase/PurchaseOrderForm";

export const dynamic = "force-dynamic";

export default function NewPurchaseOrderPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href="/purchase-orders" className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-pine">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Purchase orders
      </Link>
      <h1 className="font-display text-xl text-ink">New purchase order</h1>
      <PurchaseOrderForm />
    </div>
  );
}
