import type { BadgeTone } from "@/components/ui/Badge";

export type OrderState = "DRAFT" | "CONFIRMED" | "CANCELLED";

export interface SalesOrderRow {
  id: string;
  number: string;
  customerId: string;
  customer: { id: string; name: string } | null;
  orderDate: string;
  state: OrderState;
  amountTotal: string;
  createdAt: string;
}

export interface SalesOrderLine {
  id: string;
  productId: string;
  product: { id: string; name: string } | null;
  analyticAccountId: string | null;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
}

export interface SalesOrderDetail extends SalesOrderRow {
  lines: SalesOrderLine[];
  invoice: { id: string; number: string; state: string } | null;
}

export const ORDER_STATE_LABEL: Record<OrderState, string> = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
};

export const ORDER_STATE_TONE: Record<OrderState, BadgeTone> = {
  DRAFT: "neutral",
  CONFIRMED: "income",
  CANCELLED: "oxblood",
};
