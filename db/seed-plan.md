# Seed & Demo Data Plan

> Exact, deterministic seed for a clean, self-consistent demo. The seed is **idempotent**
> (upsert by natural key) and runs via `prisma db seed` after `prisma migrate` +
> `db/constraints.sql`. Every posting below is **balanced**, and the resulting reports are
> computed at the end so the team can verify correctness (a strong reviewer artifact).

## 0. Seed order (respect FKs)
1. Users → 2. NumberSequence → 3. Chart of Accounts → 4. Journals → 5. Product Categories →
6. Products → 7. Contacts (+ portal user) → 8. Analytic Accounts → 9. Budget + lines →
10. Sample Purchase (PO→Bill→Payment) → 11. Sample Sale (SO→Invoice→Payment) →
12. Opening capital + one Other Expense (manual entries).

## 1. Users `[dev passwords — documented, not secrets; real deploy sets its own]`
| name | email | role | password (dev) |
|---|---|---|---|
| Admin | admin@urbanfurniture.test | ADMIN | `Admin@123` |
| Accountant | accountant@urbanfurniture.test | ACCOUNTANT | `Account@123` |
| Nimesh (portal) | nimesh@urbanfurniture.test | CONTACT | `Portal@123` → linked to contact "Nimesh Pathak" |

Passwords are hashed (bcrypt/argon2) at seed time. `.env` holds `DATABASE_URL` only; no secrets in Git.

## 2. Pre-seeded Chart of Accounts `[OFFICIAL: MOCKUP]`
| code | Account Name | Type |
|---|---|---|
| 1000 | Cash A/c | ASSET |
| 1010 | Bank A/c | ASSET |
| 1100 | Debtors A/c | ASSET |
| 2000 | Creditors A/c | LIABILITY |
| 3000 | Capital A/c | CAPITAL |
| 4000 | Sales Income A/c | INCOME |
| 5000 | Purchase Expense A/c | EXPENSE |
| 5100 | Other Expense A/c | EXPENSE |

## 3. Pre-seeded Journals `[OFFICIAL: MOCKUP]`
| Journal Name | Type | Default Account |
|---|---|---|
| Sales | SALES | Sales Income A/c |
| Purchase | PURCHASE | Purchase Expense A/c |
| Bank | BANK | Bank A/c |
| Cash | CASH | Cash A/c |
| Miscellaneous | MISC | Capital A/c (used for opening/adjusting manual entries) |

## 4. NumberSequence init
`SO`(year=null,1) · `PO`(null,1) · `INV`(2026,1) · `BILL`(2026,1) · `PAY`(2026,1) · `JE`(2026,1).
Formats: `SO%05d` → SO00001 · `PO%05d` · `Inv/2026/%03d` · `Bill/2026/%04d` · `PAY/2026/%03d` · `JE/2026/%04d`.

## 5. Product Categories & Products
Categories: **Furniture**, **Electronics**, **Services**.
| Product | Type | Category | Sales Price | Cost |
|---|---|---|---|---|
| Office Chair | GOODS | Furniture | 2500.00 | 1500.00 |
| Wooden Table | GOODS | Furniture | 8000.00 | 5000.00 |
| Sofa | GOODS | Furniture | 20000.00 | 13000.00 |
| Air Conditioner | GOODS | Electronics | 25000.00 | 15000.00 |
| Delivery Service | SERVICE | Services | 1000.00 | 600.00 |

## 6. Contacts
| Name | Type | Email | City |
|---|---|---|---|
| Nimesh Pathak | CUSTOMER | nimesh@example.com | Ahmedabad |
| Azure Furniture | VENDOR | azure@example.com | Surat |
| Mr. Rahul | BOTH | rahul@example.com | Vadodara |

## 7. Analytic Accounts
| Name | Type |
|---|---|
| Showroom Sales | INCOME |
| Furniture | EXPENSE |

## 8. Budget
**FY2026 Q1** — period 2026-01-01 → 2026-03-31, responsible = Accountant, state CONFIRMED.
| Analytic | Type | Committed |
|---|---|---|
| Showroom Sales | INCOME | 100000.00 |
| Furniture | EXPENSE | 200000.00 |

## 9. Sample transactions (all balanced)

**Opening capital** (Misc journal, manual, POSTED) — `JE/2026/0001`:
```
Dr  Bank A/c        50000   /   Cr  Capital A/c   50000     (partner: —)
```

**Purchase** — PO `PO00001` (Azure Furniture) → Bill `Bill/2026/0001` → Payment `PAY/2026/001`:
- Line: Office Chair ×10 @1500 = 15000, expense acct = Purchase Expense, analytic = Furniture.
- Bill confirm (Purchase journal) — `JE/2026/0002`:
  ```
  Dr  Purchase Expense A/c   15000   /   Cr  Creditors A/c   15000   (partner: Azure)
  ```
- Payment SEND via Bank, 15000, allocated to the bill — `JE/2026/0003`:
  ```
  Dr  Creditors A/c   15000   /   Cr  Bank A/c   15000   (partner: Azure)
  ```
  → Bill: amountPaid 15000, amountDue 0, status **PAID**.

**Sale** — SO `SO00001` (Nimesh Pathak) → Invoice `Inv/2026/001` → Receipt `PAY/2026/002`:
- Line: Office Chair ×10 @2500 = 25000, income acct = Sales Income, analytic = Showroom Sales.
- Invoice confirm (Sales journal) — `JE/2026/0004`:
  ```
  Dr  Debtors A/c   25000   /   Cr  Sales Income A/c   25000   (partner: Nimesh)
  ```
- Payment RECEIVE via Cash, 25000, allocated to the invoice — `JE/2026/0005`:
  ```
  Dr  Cash A/c   25000   /   Cr  Debtors A/c   25000   (partner: Nimesh)
  ```
  → Invoice: amountPaid 25000, amountDue 0, status **PAID**.

**Other Expense** (Cash payment / manual, POSTED) — `JE/2026/0006`:
```
Dr  Other Expense A/c   1000   /   Cr  Cash A/c   1000
```

## 10. Resulting account balances (verification)
| Account | Type | Debit | Credit | Balance |
|---|---|---|---|---|
| Bank A/c | ASSET | 50000 | 15000 | **35000** |
| Cash A/c | ASSET | 25000 | 1000 | **24000** |
| Debtors A/c | ASSET | 25000 | 25000 | **0** |
| Creditors A/c | LIABILITY | 15000 | 15000 | **0** |
| Capital A/c | CAPITAL | 0 | 50000 | **50000** |
| Sales Income A/c | INCOME | 0 | 25000 | **25000** |
| Purchase Expense A/c | EXPENSE | 15000 | 0 | **15000** |
| Other Expense A/c | EXPENSE | 1000 | 0 | **1000** |

**Profit & Loss (2026):** Income 25000 − Expenses (15000 + 1000 = 16000) = **Net Income 9000**.

**Balance Sheet (2026):**
- Assets = Bank 35000 + Cash 24000 + Debtors 0 = **59000**
- Liabilities = Creditors 0; Capital = Capital 50000 + Net Income 9000 = **59000**
- **Assets 59000 = Liabilities + Capital 59000 ✅ (INV-4 holds)**

**Budget Report (FY2026 Q1):**
- Furniture (EXPENSE): committed 200000, achieved 15000 → 7.5%, remaining 185000.
- Showroom Sales (INCOME): committed 100000, achieved 25000 → 25%, remaining 75000.

> This seed proves the ledger, both reports, and the budget rollup on real, balanced data —
> exactly the "transactions change the financial state" story for the demo.
