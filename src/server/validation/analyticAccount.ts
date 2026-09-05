import { z } from "zod";
import { AnalyticType } from "@prisma/client";

export const createAnalyticAccountSchema = z.object({
  name: z.string().trim().min(1).max(120),
  type: z.nativeEnum(AnalyticType),
});

export const updateAnalyticAccountSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    type: z.nativeEnum(AnalyticType).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update." });

export type CreateAnalyticAccountInput = z.infer<typeof createAnalyticAccountSchema>;
export type UpdateAnalyticAccountInput = z.infer<typeof updateAnalyticAccountSchema>;
