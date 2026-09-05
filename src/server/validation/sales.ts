import { z } from "zod";
import { ContactType, ProductType } from "@prisma/client";

export const createContactSchema = z.object({
  name: z.string().trim().min(1).max(200),
  type: z.nativeEnum(ContactType).default(ContactType.CUSTOMER),
  email: z.string().trim().toLowerCase().email().max(200).optional(),
  phone: z.string().trim().max(40).optional(),
  street: z.string().trim().max(200).optional(),
  city: z.string().trim().max(100).optional(),
  state: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
  pincode: z.string().trim().max(20).optional(),
});

export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(200),
  type: z.nativeEnum(ProductType).default(ProductType.GOODS),
  categoryId: z.string().uuid().optional(),
  categoryName: z.string().trim().min(1).max(120).optional(),
  salesPrice: z.number().nonnegative().default(0),
  cost: z.number().nonnegative().default(0),
});

export const salesOrderLineSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive(), // > 0 (negative/zero rejected here)
  unitPrice: z.number().nonnegative(), // >= 0
  analyticAccountId: z.string().uuid().optional(),
});

export const createSalesOrderSchema = z.object({
  customerId: z.string().uuid(),
  orderDate: z.coerce.date().optional(),
  lines: z.array(salesOrderLineSchema).min(1),
});

// A payment settles exactly one document: a customer invoice (RECEIVE) or a vendor bill
// (SEND). The XOR is enforced here, in the service, and by the DB (alloc_target_xor).
// Direction is NEVER taken from the client — the service derives it from the document.
export const createPaymentSchema = z
  .object({
    invoiceId: z.string().uuid().optional(),
    billId: z.string().uuid().optional(),
    method: z.enum(["CASH", "BANK"]),
    amount: z.number().positive(), // > 0
    paymentDate: z.coerce.date().optional(),
    note: z.string().trim().max(500).optional(),
  })
  .refine((d) => Boolean(d.invoiceId) !== Boolean(d.billId), {
    message: "Provide exactly one of invoiceId or billId.",
    path: ["invoiceId"],
  });

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type CreateSalesOrderInput = z.infer<typeof createSalesOrderSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

export const updateContactSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    type: z.nativeEnum(ContactType).optional(),
    email: z.string().trim().toLowerCase().email().max(200).optional(),
    phone: z.string().trim().max(40).optional(),
    street: z.string().trim().max(200).optional(),
    city: z.string().trim().max(100).optional(),
    state: z.string().trim().max(100).optional(),
    country: z.string().trim().max(100).optional(),
    pincode: z.string().trim().max(20).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update." });

export const updateProductSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    type: z.nativeEnum(ProductType).optional(),
    categoryId: z.string().uuid().optional(),
    categoryName: z.string().trim().min(1).max(120).optional(),
    salesPrice: z.number().nonnegative().optional(),
    cost: z.number().nonnegative().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update." });

export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
