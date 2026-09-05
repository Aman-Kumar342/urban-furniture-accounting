import { z } from "zod";

const manualLineSchema = z
  .object({
    accountId: z.string().uuid(),
    debit: z.number().nonnegative().optional(),
    credit: z.number().nonnegative().optional(),
    partnerId: z.string().uuid().optional(),
    analyticAccountId: z.string().uuid().optional(),
    label: z.string().trim().max(200).optional(),
  })
  .refine((l) => (l.debit ?? 0) > 0 !== ((l.credit ?? 0) > 0), {
    message: "Each line must have exactly one positive side (debit or credit).",
  });

export const createManualJournalEntrySchema = z.object({
  journalId: z.string().uuid(),
  date: z.coerce.date(),
  reference: z.string().trim().max(200).optional(),
  partnerId: z.string().uuid().optional(),
  lines: z.array(manualLineSchema).min(2),
});

export type CreateManualJournalEntryInput = z.infer<typeof createManualJournalEntrySchema>;
