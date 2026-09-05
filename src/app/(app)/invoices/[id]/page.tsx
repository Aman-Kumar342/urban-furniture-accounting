import Link from "next/link";
import { InvoiceDetail } from "../InvoiceDetail";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href="/invoices" className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-pine">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Invoices
      </Link>
      <InvoiceDetail id={id} />
    </div>
  );
}
