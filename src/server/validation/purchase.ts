import { z } from "zod";

export const purchaseOrderLineSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive(), // > 0
  unitPrice: z.number().nonnegative(), // >= 0
  analyticAccountId: z.string().uuid().optional(),
});

export const createPurchaseOrderSchema = z.object({
  vendorId: z.string().uuid(),
  orderDate: z.coerce.date().optional(),
  lines: z.array(purchaseOrderLineSchema).min(1),
});

export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
