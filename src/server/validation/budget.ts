import { z } from "zod";

const budgetLineInput = z.object({
  analyticAccountId: z.string().uuid(),
  committedAmount: z.number().nonnegative(),
});

export const createBudgetSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    periodStart: z.coerce.date(),
    periodEnd: z.coerce.date(),
    responsibleId: z.string().uuid().optional(),
    lines: z.array(budgetLineInput).min(1),
  })
  .refine((d) => d.periodEnd >= d.periodStart, {
    message: "periodEnd must be on or after periodStart.",
    path: ["periodEnd"],
  });

export const updateBudgetSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    periodStart: z.coerce.date().optional(),
    periodEnd: z.coerce.date().optional(),
    responsibleId: z.string().uuid().nullable().optional(),
    lines: z.array(budgetLineInput).min(1).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update." });

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
