import { PortalInvoiceDetail } from "../../PortalInvoiceDetail";

export const dynamic = "force-dynamic";

export default async function PortalInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PortalInvoiceDetail id={id} />;
}
