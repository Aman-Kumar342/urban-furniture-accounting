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

// Editable header fields on a DRAFT vendor bill (the vendor's own reference + due date).
export const updateBillSchema = z
  .object({
    reference: z.string().trim().max(60).nullable().optional(),
    dueDate: z.coerce.date().nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update." });

export type UpdateBillInput = z.infer<typeof updateBillSchema>;
