# Financial Reports — Module Notes (Balance Sheet & P&L)

> Read-only projections of the POSTED ledger. Code: `src/server/repositories/ledger.repo.ts`
> (one grouped aggregation), `src/server/services/report.service.ts`, `validation/report.ts`,
> `src/app/api/reports/{profit-loss,balance-sheet}/route.ts`. Budget Report is a separate
> deferred phase.

## The reviewer framing (say it this way)
> **The ledger is already balanced.** Every POSTED entry has Σdebit = Σcredit (service +
> DB trigger). **Current Year Earnings** is simply the presentation of cumulative income −
> expenses inside the equity section, so the accounting equation
> **Assets = Liabilities + Capital + Current Year Earnings** is represented correctly.
> We never adjust transactions to make a report balance.

## Source & rules
One grouped SQL over `JournalItem → JournalEntry → Account`, **POSTED entries only** (DRAFT
and CANCELLED excluded). Per account: `signed = Σdebit − Σcredit`; debit-normal accounts
(ASSET, EXPENSE) report `signed`, credit-normal (LIABILITY, INCOME, CAPITAL) report `−signed`.
Decimal throughout. No writes, no denormalized report tables.

## Date/period semantics (A-2, documented so the two reports aren't confused)
- **P&L** = flow within the selected **calendar year** (`Jan 1 … Dec 31`).
- **Balance Sheet** = cumulative **snapshot as of Dec 31** of the selected year (all POSTED
  entries dated on/before that date). *(Prior-year retained-earnings roll-forward is out of
  scope — single fiscal year.)*

## P&L (returns)
`income[]` (code, name, balance) · `totalIncome` · `expenses[]` · `totalExpenses` ·
**`netIncome = totalIncome − totalExpenses`**.

## Balance Sheet (returns)
`assets[]` · `totalAssets` · `liabilities[]` · `totalLiabilities` · `capital[]` ·
`totalCapital` · **`currentYearEarnings`** (cumulative income − expenses) ·
`totalLiabilitiesAndCapital` (= liabilities + capital + earnings) · `difference` ·
**`balanced`**. `difference` is always `0` / `balanced: true` by the invariant.

## Why it always balances
Summing `signed` over ALL accounts = 0 (every posted entry balances), which rearranges to
`Assets = Liabilities + Capital + (Income − Expenses)`. Folding earnings into equity makes
`Assets ≡ Liabilities + Capital`. A test asserts `difference == 0` after real transactions.

## API (read-only, staff only)
`GET /api/reports/profit-loss?year=YYYY` · `GET /api/reports/balance-sheet?year=YYYY`.
`year` validated (2000–2100, default current). Contacts cannot access company financials.

## Performance
One `GROUP BY` aggregation per report (no N+1, no loops). Uses existing indexes on
`JournalItem(accountId)`, `JournalEntry(date)`, `(state)`. A composite `@@index([state,date])`
can be added if volume warrants (measured, not preemptive). No ledger duplication.

## Tests (47 total, all green; 6 new here)
BS always balances; empty period → zeros + balanced; a sale → +Income/+Bank, Debtors net 0,
+netIncome, still balanced; a purchase → +Expenses/−Bank, −netIncome, still balanced; draft
(unposted) invoices excluded; year filtering works. Files run sequentially
(`fileParallelism: false`) so delta assertions aren't disturbed. Sales/Purchase suites remain
green (regression preserved).

## Actual response (live, dev DB) — balances exactly
```
P&L 2026:   totalIncome 246000  totalExpenses 121000  netIncome 125000
BalanceSheet 2026:
  assets       Cash 1500 + Bank 77500 + Debtors 84000 = 163000
  liabilities  Creditors 38000
  capital      0   currentYearEarnings 125000
  totalLiabilitiesAndCapital 163000   difference 0   balanced true
```

## Reviewer demo flow (the payoff — verified live)
Baseline reports → confirm Sale + receive payment → **Income/net/assets +25000, still
balanced** → confirm Purchase + pay vendor → **Expenses +15000, net/assets −15000, still
balanced**. Proves Transaction → Journal → Ledger → Report.

## Known gaps / next
Budget Report deferred (needs Budget CRUD + the A-3 analytic-source decision). No PDF export
yet (mockup shows Print); no UI. **Next: React UI** to surface Master Data → Transactions →
Reports, then dashboard/polish.
