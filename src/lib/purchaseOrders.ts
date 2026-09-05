import type { OrderState } from "@/lib/salesOrders";

// Purchase orders share the OrderState lifecycle (Draft/Confirmed/Cancelled) and status
// label/tone maps with sales orders — imported from lib/salesOrders, not duplicated.
export interface PurchaseOrderRow {
  id: string;
  number: string;
  vendorId: string;
  vendor: { id: string; name: string } | null;
  orderDate: string;
  state: OrderState;
  amountTotal: string;
  createdAt: string;
}

export interface PurchaseOrderLine {
  id: string;
  productId: string;
  product: { id: string; name: string } | null;
  analyticAccountId: string | null;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
}

export interface PurchaseOrderDetail extends PurchaseOrderRow {
  lines: PurchaseOrderLine[];
  bill: { id: string; number: string; state: string } | null;
}
