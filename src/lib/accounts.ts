import type { BadgeTone } from "@/components/ui/Badge";

export type AccountType = "ASSET" | "LIABILITY" | "INCOME" | "EXPENSE" | "CAPITAL";

// Mirrors the Account model returned by the API. `code` is unique and immutable after creation.
export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  parentId: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "ASSET", label: "Asset" },
  { value: "LIABILITY", label: "Liability" },
  { value: "INCOME", label: "Income" },
  { value: "EXPENSE", label: "Expense" },
  { value: "CAPITAL", label: "Capital" },
];

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  ASSET: "Asset",
  LIABILITY: "Liability",
  INCOME: "Income",
  EXPENSE: "Expense",
  CAPITAL: "Capital",
};

export const ACCOUNT_TYPE_TONE: Record<AccountType, BadgeTone> = {
  ASSET: "pine",
  LIABILITY: "walnut",
  INCOME: "income",
  EXPENSE: "amber",
  CAPITAL: "neutral",
};

// Orders accounts into a parent→child tree (siblings by code); a row whose parent isn't in the
// set becomes a root. Returns a flat, display-ordered list carrying each row's depth.
export function buildAccountRows(accounts: Account[]): { account: Account; depth: number }[] {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const childrenOf = new Map<string | null, Account[]>();
  for (const a of accounts) {
    const key = a.parentId && byId.has(a.parentId) ? a.parentId : null;
    const arr = childrenOf.get(key) ?? [];
    arr.push(a);
    childrenOf.set(key, arr);
  }
  for (const arr of childrenOf.values()) arr.sort((a, b) => a.code.localeCompare(b.code));

  const rows: { account: Account; depth: number }[] = [];
  const walk = (parentKey: string | null, depth: number) => {
    for (const a of childrenOf.get(parentKey) ?? []) {
      rows.push({ account: a, depth });
      walk(a.id, depth + 1);
    }
  };
  walk(null, 0);
  return rows;
}
