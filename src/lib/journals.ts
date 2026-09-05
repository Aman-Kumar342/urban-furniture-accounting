import type { BadgeTone } from "@/components/ui/Badge";

export type JournalType = "SALES" | "PURCHASE" | "BANK" | "CASH" | "MISC";

// Mirrors the Journal model. The list endpoint includes defaultAccount; the detail endpoint
// returns only defaultAccountId (the edit form resolves the account via the accounts picker).
export interface Journal {
  id: string;
  name: string;
  type: JournalType;
  defaultAccountId: string;
  defaultAccount?: { id: string; code: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export const JOURNAL_TYPES: { value: JournalType; label: string }[] = [
  { value: "SALES", label: "Sales" },
  { value: "PURCHASE", label: "Purchase" },
  { value: "BANK", label: "Bank" },
  { value: "CASH", label: "Cash" },
  { value: "MISC", label: "Miscellaneous" },
];

export const JOURNAL_TYPE_LABEL: Record<JournalType, string> = {
  SALES: "Sales",
  PURCHASE: "Purchase",
  BANK: "Bank",
  CASH: "Cash",
  MISC: "Miscellaneous",
};

export const JOURNAL_TYPE_TONE: Record<JournalType, BadgeTone> = {
  SALES: "income",
  PURCHASE: "walnut",
  BANK: "pine",
  CASH: "pine",
  MISC: "neutral",
};
