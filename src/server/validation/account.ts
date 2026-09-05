import { z } from "zod";
import { AccountType } from "@prisma/client";

export const createAccountSchema = z.object({
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(120),
  type: z.nativeEnum(AccountType),
  parentId: z.string().uuid().nullable().optional(),
});

export const updateAccountSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    type: z.nativeEnum(AccountType).optional(),
    parentId: z.string().uuid().nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update." });

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
