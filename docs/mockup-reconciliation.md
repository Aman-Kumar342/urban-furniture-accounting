# Mockup Reconciliation

> Screen-by-screen reading of the **official mockup** (`docs/mockup/mockup-full-light.png`,
> Excalidraw export; a dark-mode twin exists with identical content). This is the UI/behavior
> source of truth; read with `problemstatement.md`. Where the mockup and the written PS
> differ, conflicts are flagged in the last section — **not silently resolved**.
>
> Labels: `[OFFICIAL: PS]` written problem statement · `[OFFICIAL: MOCKUP]` shown in the
> mockup · `[ENGINEERING DECISION]` our choice · `[CONFLICT]` PS vs mockup disagree.

---

## 1. Navigation & Dashboard `[OFFICIAL: MOCKUP]`
- **Top menu (4 groups):** **Sales · Purchase · Account · Report**.
  - **Sales:** Sales Order, Sale Invoice, Receipt.
  - **Purchase:** Purchase Order, Purchase Bill, Payment.
  - **Account:** Contact, Product, Analytic Account, Chart of Accounts, Journal,
    Journal Entries. *(Master data lives under "Account".)*
  - **Report:** Balance Sheet, Profit & Loss, Budget Report.
- **App Dashboard cards** (all counts are live/dynamic):
  - **Sales** — `New`; tiles: All / Confirmed / Draft (counts).
  - **Purchase** — `New`; tiles: All / Confirmed / Draft (counts).
  - **Budget Reports** — `Report`; tiles: Achieved / Budget / Committed (counts).

## 2. Master Data

### 2.1 Contact `[OFFICIAL: MOCKUP]`
- **Form:** `New`, `Confirm`, `Back`. Fields: **Contact Name**, **Email** (unique),
  **Phone**, **Address = Street, City, State, Country, Pincode**, **Upload Image**.
- **List:** Select (checkbox), Image, Name, Email, Phone; Search; list/kanban toggle.
- ⚠ `[CONFLICT]` The PS lists **Type (Customer/Vendor/Both)**; the mockup form does
  **not** show it. See Conflicts §9.

### 2.2 Product `[OFFICIAL: MOCKUP]`
- **Form:** `New`, `Confirm`, `Back`. Fields: **Product Name**, **Product Type**
  (dropdown: Goods / Service / Combo), **Category** (Many2one, *creatable on the fly*),
  **Sales Price**, **Cost**, **Upload Image**.
- **List:** Select, Product, Category, Type, Sales Price, Cost. (e.g. Air Conditioner /
  Electronics / Goods / 25000 / 15000.)

### 2.3 Chart of Accounts `[OFFICIAL: MOCKUP]`
- **List:** `New`, `Confirm`, `Archived`, `Home`, `Back`. Columns: **Account Name, Type**.
- **Pre-configured** (seed these exactly):
  | Account Name | Type |
  |---|---|
  | Bank A/c | Asset |
  | Cash A/c | Asset |
  | Debtors A/c | Asset |
  | Creditors A/c | Liability |
  | Sales Income A/c | Income |
  | Purchase Expense A/c | Expense |
  | Other Expense A/c | Expense |
  | Capital A/c | Capital |
- **New form:** Account Name, Type (dropdown: Asset / Liability / Income / Expense / Capital).

### 2.4 Journals `[OFFICIAL: MOCKUP]`
- **List:** `New`, `Back`. Columns: **Journal Name, Type, Default Account** (a single
  default account, not separate Dr/Cr defaults). Seed:
  | Journal | Type | Default Account |
  |---|---|---|
  | Sales | Sales | Sales Income A/c |
  | Purchase | Purchase | Purchase Expense A/c |
  | Bank | Bank | Bank A/c |
  | Cash | Cash | Cash A/c |

### 2.5 Analytic Account `[OFFICIAL: MOCKUP]`
- Analytic (a.k.a. **Budget Analytics**) with Name and **Type (Income/Expense)**; selected
  on transaction **lines** to tie spend/revenue to a budget (e.g. "Furniture", "Project 1").

## 3. Journal Entries (manual) `[OFFICIAL: MOCKUP]`
- **List:** columns **Date, Number, Partner, Journal, Total, Status**.
  Numbers like `Bill/2026/0001`, `Inv/2026/001`; Status **Posted / Draft**.
- **Form (New):** `Post`, `Cancel`, `Back`. Header: **Accounting Date**, **Journal**
  (Many2one). Lines table: **Account** (Many2one → Chart of Accounts), **Partner**
  (Many2one → Contact), **Debit**, **Credit**.
- **Blocking rule:** *"Blocking warning if the debit and credit amount don't match"* —
  a manual entry **cannot be posted unless Σ Debit = Σ Credit**.
- Field notes: *Account = selection from Chart of Accounts (Many2one); Partner = selection
  from Contact master. The transaction is connected through the Chart of Accounts.*

## 4. Transactions

**Common line grid** (all four documents): `Sr. No.` · **Product** (Many2one) ·
**Budget Analytics** (Many2one) · **Qty** (numeric) · **Unit Price** (monetary) ·
**Total** = *Unit Price × Qty*. Document total = Σ line totals.

### 4.1 Purchase Order `[OFFICIAL: MOCKUP]`
- Header: Vendor, PO date, lines as above. `[ENGINEERING DECISION]` No Chart-of-Account
  column (PO is commercial, posts no accounting).
- **On Confirm:** *non-blocking* warning **"Exceeds Approved Budget"** if a line amount
  exceeds the remaining budget for its analytic. Status: Draft → Confirmed.

### 4.2 Vendor / Purchase Bill `[OFFICIAL: MOCKUP]`
- Header: Vendor, Bill date, Due date; **Status: Not Paid / Partial / Paid** (one at a time).
- Lines add a **Chart of Accounts** column, **defaulted to the Purchase (expense) account**.
- Footer: **Paid Via Cash**, **Paid Via Bank**, **Amount Due = Total − Amount Paid**.
- **On Confirm:** auto-creates a **balanced journal entry** in the **Purchase** journal
  (visible in Journal Entries). Posting (no tax — see §9):
  ```
  Dr  Purchase Expense A/c     total     (Partner = vendor)
      Cr  Creditors A/c            total
  ```
- Non-blocking "Exceeds Approved Budget" warning on confirm (as PO).

### 4.3 Sales Order `[OFFICIAL: MOCKUP]`
- Header: **SO No.** (e.g. `SO00001`), **Customer** (Many2one), **SO Date**; common line grid.
- `[ENGINEERING DECISION]` No Chart-of-Account column (SO is commercial).
- ⚠ `[CONFLICT]` PS says SO has **Tax**; the mockup SO has **no tax column**. See §9.

### 4.4 Customer Invoice `[OFFICIAL: MOCKUP]`
- Header: **Customer** (Many2one), **Invoice Date**, **Due Date**,
  **Status: Not Paid / Partial / Paid**.
- Lines add a **Chart of Accounts** column, **defaulted to the Sales (income) account**.
- Footer: **Paid Via Cash**, **Paid Via Bank**, **Amount Due = Total − Amount Paid**.
- **On Confirm:** auto-creates a **balanced journal entry** in the **Sales** journal.
  Posting (no tax — see §9):
  ```
  Dr  Debtors A/c              total     (Partner = customer)
      Cr  Sales Income A/c         total
  ```

### 4.5 Payment (Receipt / Payment) `[OFFICIAL: MOCKUP]`
- Screen: `Confirm`, `Cancel`. Fields: **Payment Type** (radio **Send** = pay vendor /
  **Receive** = receive from customer), **Partner** (autofilled from the doc),
  **Amount** (autofilled from the doc's Amount Due), **Note** (text). Journal = Cash or Bank.
- Postings:
  ```
  Receive (customer):   Dr  Cash/Bank        amount   /  Cr  Debtors A/c    amount
  Send (vendor):        Dr  Creditors A/c    amount   /  Cr  Cash/Bank      amount
  ```
- Updates the document's Amount Due; status recomputed:
  **Paid** if due = 0 · **Partial** if 0 < due < total · **Not Paid** if due = total.

## 5. Budget

### 5.1 Budget (Form) `[OFFICIAL: MOCKUP]`
- Buttons: `New`, `Confirm`, `Revise`, `Cancel`. **Status: Draft → Confirm → Revised → Cancelled.**
- Header: **Budget Name**, **Budget Period** (Start Date → End Date), **Revised With**,
  **Responsible**. Revisions link to the **Original Budget** (self-reference; on revision,
  keep the name and append "Revised").
- **Lines:** **Analytic**, **Type**, **Committed Amount** (planned), **Achieved Amount**
  (actual, from tagged transactions), **Achieved %** = Achieved / Committed,
  **Amount To Achieve** = Committed − Achieved. (e.g. Furniture / Expense / 200000 / 10000
  / 5% / 190000.)

### 5.2 Budget Report (List) `[OFFICIAL: MOCKUP]`
- `New`, `Search`, `Back`. Columns: **Budget, Start Date, End Date, Status, Pie Chart**
  (Achieved vs Balance). Row opens the budget form on click.

## 6. Reports

### 6.1 Profit & Loss `[OFFICIAL: MOCKUP]`
- `Print` (**PDF download on click**), **Year** filter (e.g. 2026), `Back`.
- Rows (with Balance column) and computation:
  | Line | Computation |
  |---|---|
  | Income | Total of Income accounts |
  | — Income from Sales | Total of account type *Income* |
  | Expenses | Total of all expense accounts |
  | — Purchase Expense | Total of account type *Expense* |
  | — Other Expense | Total of *Other Expense* account |
  | **Net Income** | **Income − Expenses** |

### 6.2 Balance Sheet `[OFFICIAL: MOCKUP]`
- `Print`, **Year** filter, `Back`. Two columns:
  - **Assets:** Bank, Cash, Debtors (asset-type accounts).
  - **Liabilities:** Capital, Creditors (liability + capital accounts).
- Footer: **Total Asset** and **Total Liability** — must be equal (INV-4). Accounts map to
  a side by their **type**.

## 7. Document Numbering `[OFFICIAL: MOCKUP]`
Per-type human-readable sequences: **SO** `SO00001`; **Invoice** `Inv/2026/001`;
**Bill** `Bill/2026/0001`; (Payments/Receipts similarly). `[ENGINEERING DECISION]` Implement
a sequence generator keyed by document type (+ year where shown).

## 8. Status Lifecycles (summary)
| Entity | States |
|---|---|
| Purchase Order / Sales Order | Draft → Confirmed |
| Vendor Bill / Customer Invoice (posting) | Draft → Confirmed (auto journal entry) |
| Vendor Bill / Customer Invoice (payment) | Not Paid → Partial → Paid |
| Journal Entry | Draft → Posted |
| Budget | Draft → Confirm → Revised → Cancelled |
| Payment | Draft → Confirmed |

## 9. Conflicts & Decisions (flagged, awaiting confirmation)

### C-1 — TAX: PS says yes, mockup says no ⚠ `[CONFLICT]`
- **PS:** "Sales Order … Unit Price, **Tax**"; System "**computes taxes**".
- **Mockup:** No tax column on SO/Invoice/PO/Bill; **no tax account** in the seeded CoA;
  journal entries have **no tax leg** (Dr Debtors / Cr Sales Income for the full amount).
- **Recommended decision `[ENGINEERING DECISION]`:** **Follow the mockup — no tax in P0.**
  It matches the official reference exactly, keeps every entry cleanly balanced, and
  simplifies the demo. Tax becomes an **optional P3 enhancement** (add an Output/Input tax
  account + a tax leg) only if time allows.
- **Schema impact:** drop tax accounts/columns from the core model; the posting engine
  stays 2-legged. *(This is the default we will build on unless told otherwise.)*

### C-2 — CONTACT TYPE: PS lists it, mockup omits it ⚠ `[CONFLICT]`
- **PS:** Contact has **Type (Customer/Vendor/Both)**. **Mockup:** the contact form has no
  Type field; a contact is a generic partner used as either customer or vendor.
- **Recommended decision `[ENGINEERING DECISION]`:** **Keep a `type` field** (default
  `BOTH`) — it is PS-required, nearly free, and enables customer/vendor filtering on
  document pickers — while the form can hide it or default it to match the mockup's
  simplicity.

### C-3 — "Stock reports" `[CONFLICT]` (minor)
- PS overview mentions "stock reports"; neither the detailed PS report list nor the mockup
  includes them. **Decision:** out of scope for P0 (unchanged).

### C-4 — Budget "Committed vs Achieved" source (ambiguity, not a conflict)
- Mockup shows **Committed** (planned) and **Achieved** (actual) per analytic, but not which
  documents feed "Achieved". **Decision `[ENGINEERING DECISION]`:** "Achieved" = Σ of
  **confirmed** Bill/Invoice line amounts tagged to that analytic within the budget period;
  the PO/Bill confirm-time "Exceeds Approved Budget" check compares against remaining
  Committed. To be confirmed during the budget phase.
