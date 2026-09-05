import { PortalBillDetail } from "../../PortalBillDetail";

export const dynamic = "force-dynamic";

export default async function PortalBillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PortalBillDetail id={id} />;
}
