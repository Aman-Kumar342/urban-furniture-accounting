# Urban Furniture — Accounting System

> **Single source of truth** for what this product must do. Every feature, table,
> endpoint, and screen we build must trace back to something in this document.
> If it is not here, we do not build it (without first adding it here).
>
> **Labeling:** `[OFFICIAL REQUIREMENT]` = stated in the Odoo problem statement (PS).
> `[ENGINEERING DECISION]` = our implementation choice. `[RECOMMENDED ENHANCEMENT]`
> = adds scoring value, not required. `[OPTIONAL]` = only if time remains.

---

## 1. Problem Overview

Urban Furniture needs an accounting system that lets the business record its real
commercial activity (buying and selling furniture) and turns that activity into
correct, double-entry accounting records and live financial reports.

The system is not a set of CRUD screens. It is a small **accounting engine**: master
data feeds transactions, transactions post **balanced journal entries** to a ledger,
and reports (Balance Sheet, P&L, Budget) are **derived from that ledger in real time**.

`[OFFICIAL REQUIREMENT]` The PS asks for: entry of core master data; recording of
sales, purchases, and payments using that master data; and automated generation of
financial and stock reports (Balance Sheet, P&L, Budget Report).

## 2. Objective

Build the **strongest possible vertical slice** of an accounting system in 24 hours:
- Correct double-entry accounting (debits always equal credits).
- Two complete transaction flows end-to-end: **Purchase** and **Sales**.
- Real-time financial reports that visibly change when transactions are posted.
- A clean, normalized PostgreSQL data model as the foundation (the highest-weighted
  judging criterion).

Success = a judge watches us record a purchase and a sale, register payments, and
sees the Balance Sheet and P&L update correctly and tie together — with a data model
we can defend line by line.

## 3. Primary Actors

`[OFFICIAL REQUIREMENT]` The PS defines three human actors plus the System.

### Admin / Business Owner
- **Purpose:** owns the business and its books.
- **Permissions:** full CRUD on all master data (create / modify / **archive**),
  record all transactions, register payments, view all reports, manage users.
- Can archive (not hard-delete) master data to preserve historical integrity.

### Accountant / Invoicing User
- **Purpose:** day-to-day bookkeeping.
- **Permissions:** create master data, record transactions (PO, Bill, SO, Invoice,
  Payment), view reports.
- `[ENGINEERING DECISION]` Cannot manage users or change system configuration
  (that is Admin-only). Cannot hard-delete posted accounting records.

### Contact (Portal User)
- **Purpose:** a customer/vendor with restricted self-service access.
- **Permissions:** view **only their own** invoices/bills and make payments against
  them. No access to master data, other contacts' documents, or reports.
- `[OFFICIAL REQUIREMENT]` "Only view their own invoice/bills and make payment."
- `[ENGINEERING DECISION]` A Contact user is created and linked to a Contact master
  record; server-side authorization must scope every query to that contact.

### System (non-human)
`[OFFICIAL REQUIREMENT]` Validates data, computes taxes, updates ledgers, generates
reports. These are automatic behaviors, not screens.

## 4. Functional Requirements

### 4.1 Master Data
| Module | `[OFFICIAL REQUIREMENT]` fields | Notes |
|---|---|---|
| **Contact Master** | Name, Type (Customer/Vendor/Both), Email, Mobile, Address (City, State, Pincode), Profile Image | A Contact may be linked to a portal user. |
| **Product Master** | Product Name, Type (Goods/Service/Combo), Sales Price, Cost (Purchase Price), Category | Category normalized to its own table `[RECOMMENDED ENHANCEMENT]`. |
| **Chart of Accounts** | Account Name, Type (Asset, Liability, Expense, Income, Capital) | Supports hierarchy via `parent_id` `[RECOMMENDED ENHANCEMENT]`; add `code` for ordering `[ENGINEERING DECISION]`. |
| **Journals** | Journal Name, Type, Default Accounts | Types: Sales, Purchase, Bank, Cash `[OFFICIAL REQUIREMENT]`. |
| **Journal Entries** | Journal, Date, Reference, Journal Items (Account, Debit, Credit) | The posted double-entry record. |
| **Analytic Accounts** | Name, Type (Income/Expense) | Cost/revenue tracking marker for budgets. |
| **Budget** | Budget Name, Period, Responsible Person (+ planned amount, analytic account) | Planned vs actual per analytic account. |

### 4.2 Transactions
`[OFFICIAL REQUIREMENT]` Transaction flow from the PS:

| Process | Fields / Details |
|---|---|
| **Purchase Order** | Select Vendor, Product, Quantity, Unit Price |
| **Vendor Bill** | Convert PO to Bill, record invoice date, due date, register payment (Cash/Bank) |
| **Sales Order** | Select Customer, Product, Quantity, Unit Price, Tax |
| **Customer Invoice** | Generate Invoice from SO and receive payment via Cash/Bank |
| **Payment** | Register against bill/invoice — select bank or cash |

### 4.3 Reports
`[OFFICIAL REQUIREMENT]`
1. **Balance Sheet** — real-time snapshot of Assets, Liabilities, and Capital.
2. **Profit & Loss** — income from sales minus purchases/expenses = net profit.
3. **Budget Report** — planned budget vs actual, per analytic account/period.

> **Note on "stock reports":** the PS overview mentions "financial and stock reports"
> but the detailed reporting section lists only Balance Sheet, P&L, and Budget. See
> §9 ambiguities. `[ENGINEERING DECISION]` We treat stock reporting as **out of P0**;
> Goods can optionally track quantity later `[OPTIONAL]`.

## 5. Accounting Concepts (only what this project needs)

- **Account:** a bucket that classifies transactions (e.g., Cash, Bank, Debtors,
  Sales Income, Purchase Expense). Has a **type**: Asset, Liability, Income, Expense,
  Capital.
- **Chart of Accounts (CoA):** the master list of all accounts.
- **Normal balances:** Assets & Expenses increase on the **debit** side; Liabilities,
  Income & Capital increase on the **credit** side.
- **Journal:** groups similar transactions (Sales, Purchase, Bank, Cash).
- **Journal Entry:** one accounting record for one transaction; has a date, journal,
  reference, and two or more **journal items**.
- **Journal Item (line):** one account with a **debit** or **credit** amount.
- **Debit / Credit:** the two sides of every entry. For a valid entry,
  **Σ debits = Σ credits**.
- **Double-entry accounting:** every transaction affects at least two accounts so the
  books always balance.
- **Ledger:** the running balance of each account, computed from its journal items.
- **Receivables (Debtors / Accounts Receivable, AR):** money customers owe us (Asset).
- **Payables (Creditors / Accounts Payable, AP):** money we owe vendors (Liability).
- **Accounting equation:** `Assets = Liabilities + Capital`, extended by
  `Capital = Opening Capital + (Income − Expenses)`. This is why the Balance Sheet
  always balances and why P&L net profit flows into the Balance Sheet.

## 6. Transaction Workflows (with the exact postings)

> These postings are the heart of the system. `[OFFICIAL REQUIREMENT]` examples from
> the PS: "Cash received from customer → Debit Cash, Credit Debtor"; "Purchase on
> credit → Debit Purchase Expense, Credit Creditor". The tax legs below are our
> `[ENGINEERING DECISION]` to satisfy "System computes taxes".

### 6.1 Sales
```
Sales Order (commercial, no accounting)
  → Customer Invoice (POST creates a journal entry in the Sales Journal):
        Dr  Accounts Receivable (Debtors)      total incl. tax
            Cr  Sales Income                        net amount
            Cr  Output Tax Payable (liability)      tax amount
  → Payment received (journal entry in Bank/Cash Journal):
        Dr  Cash / Bank                         amount paid
            Cr  Accounts Receivable (Debtors)       amount paid
  → Ledger updated → Reports reflect the change
```
Invoice status: `DRAFT → POSTED → PARTIALLY_PAID → PAID` (derived from allocations).

### 6.2 Purchase
```
Purchase Order (commercial, no accounting)
  → Vendor Bill (POST creates a journal entry in the Purchase Journal):
        Dr  Purchase Expense                    net amount
        Dr  Input Tax Receivable (asset)        tax amount   [if tax applies]
            Cr  Accounts Payable (Creditors)        total incl. tax
  → Payment made (journal entry in Bank/Cash Journal):
        Dr  Accounts Payable (Creditors)        amount paid
            Cr  Cash / Bank                         amount paid
  → Ledger updated → Reports reflect the change
```
Bill status mirrors the invoice status lifecycle.

### 6.3 Budget
```
Analytic Account (e.g., "Showroom", "Online")
  → Budget (period + planned amount per analytic account)
  → Transactions tag lines with an analytic account (actual)
  → Budget Report = planned vs actual per analytic account/period
```

### 6.4 Reporting
```
Posted Journal Items → per-account balances (ledger) → Financial Reports
  Balance Sheet: Assets vs Liabilities + Capital (incl. current-period net profit)
  P&L:           Income − Expenses = Net Profit
  Budget Report: planned vs actual (analytic)
```

## 7. Data Requirements (entity summary)

> Full ERD/DDL comes in the next phase. This is the entity intent so the spec is
> complete. `[ENGINEERING DECISION]` The **single ledger** (`journal_entries` +
> `journal_items`) is the source of truth that all documents post into.

| Entity | Purpose | Key relationships | Critical validation |
|---|---|---|---|
| `users` | auth + role | 1–1 optional to `contacts` (portal) | unique email; hashed password |
| `contacts` | customers/vendors | 1–N documents | valid email/mobile; type enum |
| `product_categories` | classify products | 1–N products | unique name |
| `products` | goods/services sold & bought | N–1 category | prices ≥ 0; type enum |
| `accounts` (CoA) | classify postings | self-ref hierarchy | type enum; unique code |
| `taxes` | compute tax | N–1 account | rate 0–100; scope enum |
| `journals` | group entries | default accounts | type enum |
| `journal_entries` | one accounting record | N–1 journal; N items | date; state; balanced |
| `journal_items` | debit/credit lines | N–1 entry, N–1 account | exactly one of debit/credit > 0 |
| `purchase_orders` / `_lines` | buying (commercial) | N–1 vendor; N lines | qty > 0; price ≥ 0 |
| `vendor_bills` / `_lines` | payables doc | N–1 vendor; 0–1 PO; 1 entry | totals = Σ lines |
| `sales_orders` / `_lines` | selling (commercial) | N–1 customer; N lines | qty > 0; price ≥ 0 |
| `customer_invoices` / `_lines` | receivables doc | N–1 customer; 0–1 SO; 1 entry | totals = Σ lines |
| `payments` | cash movement | N–1 partner; 1 entry | amount > 0 |
| `payment_allocations` | link payment↔doc | N–N payments/docs | Σ alloc ≤ doc total |
| `analytic_accounts` | cost/revenue marker | N–N via doc lines | type enum |
| `budgets` / `budget_lines` | planned amounts | N–1 analytic | planned ≥ 0; period valid |

## 8. Business Rules

1. `[OFFICIAL REQUIREMENT]` Every posted journal entry must be **balanced**
   (Σ debit = Σ credit).
2. `[ENGINEERING DECISION]` A journal item has **exactly one** non-zero side
   (debit XOR credit), both ≥ 0.
3. `[OFFICIAL REQUIREMENT]` Posting a Customer Invoice increases **AR** and **Income**
   (and tax); posting a Vendor Bill increases **Expense** and **AP** (and tax).
4. `[OFFICIAL REQUIREMENT]` A Payment reduces the **outstanding balance** of the
   invoice/bill it is allocated to; a document becomes `PAID` only when fully
   allocated, `PARTIALLY_PAID` otherwise.
5. `[ENGINEERING DECISION]` Payment allocation cannot exceed the document's amount due.
6. `[ENGINEERING DECISION]` Master data is **archived**, never hard-deleted, once
   referenced by a transaction (preserve historical integrity).
7. `[ENGINEERING DECISION]` Posted journal entries are **immutable**; corrections are
   made by cancelling/reversing, not silent edits.
8. `[ENGINEERING DECISION]` Tax = simple percentage of line net; sales tax posts to a
   liability (Output Tax), purchase tax to an asset (Input Tax).
9. `[ENGINEERING DECISION]` Money is stored as `NUMERIC(14,2)`; never floating point.
10. `[OFFICIAL REQUIREMENT]` Reports are computed from persisted journal items, never
    hardcoded.

## 9. Accounting Invariants (must always hold)

- **INV-1** Every posted entry: `Σ debit = Σ credit`.
- **INV-2** Every journal item: `debit ≥ 0 AND credit ≥ 0 AND (debit = 0 OR credit = 0) AND (debit + credit) > 0`.
- **INV-3** System-wide: `Σ all debits = Σ all credits` (follows from INV-1).
- **INV-4** Balance Sheet balances: `total Assets = total Liabilities + Capital`
  where Capital includes current-period net profit.
- **INV-5** For any document: `amount_due = total − Σ allocated_payments ≥ 0`.
- **INV-6** Posted/paid documents and their entries are not mutated in place.
- **INV-7** Every posting that touches multiple rows runs inside **one DB transaction**
  (all-or-nothing).
- **INV-8** Invalid accounting states are **rejected at the service layer**, not just
  the UI.

## 10. Non-Functional Requirements

- **Performance:** indexed foreign keys; report aggregations use grouped SQL, not
  per-row loops; no N+1; paginate long lists.
- **Security:** hashed passwords; server-side RBAC on every endpoint; Contact scoping;
  Zod validation on all inputs; no secrets in Git.
- **Scalability:** clean layering (UI → route → service → repository → Prisma) so
  modules grow independently; ledger design supports more document types without schema
  churn.
- **Usability:** consistent ERP-like layout, clear navigation, forms with inline
  validation, meaningful statuses, loading/empty/error states.
- **Responsiveness:** works on laptop and tablet widths.
- **Maintainability:** TypeScript everywhere, one accounting-posting module reused by
  all flows.
- **Reliability:** DB transactions guarantee no half-posted entries.

## 11. Scope (24-hour priority system)

### P0 — Must Have (required for the judging demo)
- Auth + RBAC (Admin, Accountant, Contact).
- Master data CRUD: Contacts, Products, Chart of Accounts, Journals.
- Sales flow: SO → Invoice (posts balanced entry incl. tax) → Payment.
- Purchase flow: PO → Vendor Bill (posts balanced entry) → Payment.
- Ledger + Balance Sheet + P&L, derived live from journal items.
- Accounting invariants enforced in a shared posting service (INV-1..INV-8).
- PostgreSQL persistence via Prisma; seed/demo data.

### P1 — Strong Scoring Features
- Analytic accounts + Budget + Budget Report.
- Payment allocation with partial payments and derived document status.
- Tax computation and tax accounts.
- Dashboard with live KPIs (AR, AP, cash, revenue) from real data.
- Contact portal (self-service invoice view + pay).

### P2 — Polish
- Consistent design system, empty/error states, confirmations.
- Pagination, filters, search on list views.
- Reversing entries for corrections; audit fields (created_by, timestamps).

### P3 — Optional / Wow
- Invoice/Bill PDF export.
- General Ledger / account drill-down report.
- Multi-currency; stock quantity tracking for Goods.

### Out of Scope (deliberately not building)
- Full stock/inventory valuation and warehouse management.
- Multi-company / multi-currency (beyond a stretch).
- Bank reconciliation, recurring entries, fixed assets, payroll.
- Any BaaS, microservices, or third-party accounting APIs.

## 12. Acceptance Criteria (testable)

- **AC-1 (Sales):** When a valid sale is invoiced, the system creates a **balanced**
  journal entry (Dr AR; Cr Income; Cr Tax), and AR + Income balances increase by the
  correct amounts.
- **AC-2 (Payment in):** When a payment is registered against a posted invoice, Cash/Bank
  increases, AR decreases by the same amount, and the invoice status becomes
  `PARTIALLY_PAID` or `PAID` correctly.
- **AC-3 (Purchase):** When a Vendor Bill is posted, the system creates a balanced entry
  (Dr Expense; Dr Input Tax; Cr AP), increasing Expense and AP correctly.
- **AC-4 (Payment out):** Paying a bill decreases AP and decreases Cash/Bank by the same
  amount; bill status updates.
- **AC-5 (Balance Sheet):** After any set of postings, `Assets = Liabilities + Capital`
  holds exactly (INV-4), and the report reflects the latest transactions.
- **AC-6 (P&L):** P&L net profit = Income − Expenses for the selected period, and equals
  the retained-earnings movement shown on the Balance Sheet.
- **AC-7 (Budget):** Budget Report shows planned vs actual per analytic account for the
  selected period, computed from tagged transactions.
- **AC-8 (Validation):** Invalid inputs (bad email, negative qty/price, unbalanced entry,
  over-allocation) are rejected server-side with a clear message.
- **AC-9 (Authorization):** A Contact user cannot load another contact's invoice or any
  master-data/report endpoint (enforced server-side, verified).
- **AC-10 (Atomicity):** If any part of a posting fails, no partial rows are written
  (the whole transaction rolls back).
