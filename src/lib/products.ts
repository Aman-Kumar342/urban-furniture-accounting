import type { BadgeTone } from "@/components/ui/Badge";

export type ProductType = "GOODS" | "SERVICE" | "COMBO";

// Mirrors the Product model returned by the API. Money fields (salesPrice, cost) are Decimal(14,2)
// serialized as strings — kept as strings and never used in float arithmetic on the client.
export interface Product {
  id: string;
  name: string;
  type: ProductType;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  salesPrice: string;
  cost: string;
  imageUrl: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export const PRODUCT_TYPES: { value: ProductType; label: string }[] = [
  { value: "GOODS", label: "Goods" },
  { value: "SERVICE", label: "Service" },
  { value: "COMBO", label: "Combo" },
];

export const PRODUCT_TYPE_LABEL: Record<ProductType, string> = {
  GOODS: "Goods",
  SERVICE: "Service",
  COMBO: "Combo",
};

export const PRODUCT_TYPE_TONE: Record<ProductType, BadgeTone> = {
  GOODS: "pine",
  SERVICE: "walnut",
  COMBO: "neutral",
};
