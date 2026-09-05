import { z } from "zod";
import { JournalType } from "@prisma/client";

export const createJournalSchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: z.nativeEnum(JournalType),
  defaultAccountId: z.string().uuid(),
});

export const updateJournalSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    type: z.nativeEnum(JournalType).optional(),
    defaultAccountId: z.string().uuid().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update." });

export type CreateJournalInput = z.infer<typeof createJournalSchema>;
export type UpdateJournalInput = z.infer<typeof updateJournalSchema>;
