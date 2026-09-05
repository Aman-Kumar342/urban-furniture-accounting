# Database Design — Invariants, Transactions & Reviewer Defense

> Companion to `prisma/schema.prisma`, `db/constraints.sql`, and `docs/ERD.md`.
> Written to be defended in front of an Odoo technical reviewer.

---

## 1. Accounting invariants (and exactly how each is enforced)

| ID | Invariant | Enforced by |
|---|---|---|
| **INV-1** | Every POSTED journal entry balances: Σ debit = Σ credit | Service `postEntry()` (primary) **+** trigger `uf_journalentry_balanced` (DB) |
| **INV-2** | Each journal item: debit ≥ 0, credit ≥ 0, exactly one non-zero | CHECK constraints on `JournalItem` |
| **INV-3** | System-wide Σ debit = Σ credit | Follows from INV-1 (every entry balanced) |
| **INV-4** | Balance Sheet balances: Assets = Liabilities + Capital (incl. current net profit) | Mathematical consequence of INV-1; verified by a report self-check + test |
| **INV-5** | For any document: amountDue = amountTotal − Σ allocations ≥ 0; status agrees | CHECKs on `VendorBill`/`CustomerInvoice` + service allocation logic |
| **INV-6** | POSTED entries/items are immutable; no un-post | Triggers `uf_journalitem_immutable`, `uf_journalentry_no_unpost` + service |
| **INV-7** | Multi-row postings are atomic | `prisma.$transaction` around every posting (see §2) |
| **INV-8** | Invalid accounting states are rejected server-side | Zod + service guards before any write |

**Posting order that satisfies the balance trigger:** create the entry as `DRAFT` →
insert its items → `UPDATE state='POSTED'`. The balance trigger fires on that final update,
by which time all items exist. This is mandatory and documented for every posting flow.

## 2. Transaction boundaries (`prisma.$transaction`, SERIALIZABLE or default RC + row locks)

Each is one atomic unit — all rows commit or none do (INV-7).

1. **Create/edit PO or SO (DRAFT):** lock+increment `NumberSequence` → insert order + lines →
   recompute `amountTotal`. (Editing allowed only while DRAFT.)
2. **Confirm PO/SO:** set `state='CONFIRMED'`; run a **read-only** budget check (non-blocking
   "Exceeds Approved Budget" warning). No accounting.
3. **Confirm Vendor Bill / Customer Invoice** (the key one):
   a. set doc `state='CONFIRMED'`;
   b. lock+increment sequence for the entry number;
   c. create `JournalEntry` (`DRAFT`, journal = Purchase/Sales, partner, source);
   d. insert the two `JournalItem`s (Bill: Dr Purchase Expense / Cr Creditors — Invoice:
      Dr Debtors / Cr Sales Income);
   e. set `JournalEntry.amount`, then `UPDATE state='POSTED'` (balance trigger validates);
   f. link `doc.journalEntryId`. Initialize `amountPaid=0`, `amountDue=amountTotal`,
      `paymentStatus='NOT_PAID'`.
4. **Register Payment (confirm):**
   a. lock+increment payment sequence; create `Payment` (`CONFIRMED`);
   b. create + post its `JournalEntry` (Receive: Dr Cash/Bank / Cr Debtors — Send:
      Dr Creditors / Cr Cash/Bank);
   c. insert `PaymentAllocation`(s); for each target doc **lock the row**, recompute
      `amountPaid += alloc`, `amountDue`, and derive `paymentStatus`; reject if any
      allocation exceeds the doc's remaining `amountDue` (INV-5).
5. **Manual Journal Entry post:** create DRAFT + items → validate balanced (service) →
   `UPDATE state='POSTED'` (trigger re-validates).

**Concurrency:** document numbering uses `SELECT … FOR UPDATE` on the `NumberSequence` row
so two simultaneous creates cannot collide. Payment allocation locks each target document
row to prevent a double-spend race on `amountDue`.

## 3. Index strategy (with the reason for each)

- **All foreign keys are indexed** (PostgreSQL does not auto-index FK columns) — needed for
  the many "list documents for this partner/product/account" screens and for join
  performance. Declared as `@@index` in the schema. Audit stamps (`createdById`/
  `responsibleId`) are deliberately un-FK'd — see §8.
- **`JournalItem(accountId)`** — the hot path for the ledger and both financial reports
  (group balances by account).
- **`JournalItem(analyticAccountId)`** — Budget "Achieved" aggregation per analytic.
- **`JournalEntry(date)`, `(state)`, `(journalId)`** — Journal Entries list, period report
  filters, and posted-only report scans.
- **Document `(state)`, `(paymentStatus)`, `(date)`, partner FK** — pipeline/list filters on
  the dashboard and document lists.
- **Unique** on all numbers/emails/codes/names — data integrity and fast lookups.

Reports never loop in application code: they are single `GROUP BY`/`SUM` queries over
`JournalItem` joined to `Account` (P&L/Balance Sheet) or `AnalyticAccount` (Budget). No N+1.

## 4. Monetary & data-type decisions

- **Money = `Decimal(14,2)`**, never float — exact currency math, no rounding drift. Max
  ±999,999,999,999.99, ample for the domain.
- **Quantity = `Decimal(14,3)`** — allows fractional service/units while keeping money at 2dp.
- **`lineTotal` stored** = `round(quantity × unitPrice, 2)`; document `amountTotal` stored =
  Σ line totals. These are **maintained inside the same transaction** as the lines and are
  **frozen once the doc is CONFIRMED**, so they cannot drift (defensible denormalization for
  fast lists and the budget check).
- **`amountDue` stored** with a DB CHECK `amountDue = amountTotal − amountPaid`, so it is
  impossible to persist a drifting value.
- **`JournalEntry.amount` cached** = entry total; entries are immutable after POSTED, so this
  cannot drift either. Used only for the entry-list "Total" column.
- **Dates** as `@db.Date` for accounting/business dates; `DateTime` for audit timestamps.

## 5. Reviewer-defensibility (10-point) for the data layer

1. **Requirement satisfied:** all master data, transactions, budget, and reporting entities
   from PS + mockup exist (see ERD §3 mapping).
2. **Business logic:** double-entry is structural — documents post into one ledger; reports
   derive from it. No numbers are stored that aren't reproducible from journal items.
3. **Database impact:** 22 tables, normalized to ~3NF; deliberate denormalizations
   (`amountTotal`, `amountDue`, `JournalEntry.amount`, `JournalEntry.partnerId`) are all
   drift-proof (frozen/immutable/CHECK-tied) and justified for read performance.
4. **API impact:** clean resource boundaries per aggregate (contacts, products, accounts,
   journals, invoices, bills, payments, budgets, reports) — thin handlers over services.
5. **Security:** RBAC via `User.role`; Contact portal scoped through `User.contactId` →
   only their own invoices/bills; no cross-tenant leakage by construction.
6. **Validation:** three layers — Zod (API), service guards (domain), DB CHECK/UNIQUE/FK/
   trigger (last line). Bad states are rejected before or at persistence.
7. **Testing:** unit tests for `postEntry` balance + tax-free postings; integration tests for
   the two flows; report tests asserting INV-4 and P&L↔BS tie-out; negative tests for
   over-allocation, unbalanced manual entry, and Contact authorization.
8. **Performance:** indexed FKs + report columns; grouped SQL aggregation; pagination on
   lists; no N+1; frozen caches avoid recomputation on hot lists.
9. **Demo/reviewer explanation:** open a posted invoice → show its `JournalEntry`/`JournalItem`
   rows → show the same rows moving the Balance Sheet and P&L; both reports tie out.
10. **Known limitations:** see §7.

## 6. Security notes specific to the schema

- Passwords stored only as `passwordHash` (bcrypt/argon2) — never plaintext.
- Portal (`CONTACT`) users have `contactId`; every Contact-facing query is filtered by it at
  the service layer, and the API is the real gate (UI hiding is not security).
- Master data is archived (`isArchived`), never hard-deleted once referenced; `onDelete`
  defaults to restrict for referenced masters, cascade only for owned children (lines,
  items, allocations).

## 7. Known limitations (stated up front)

- **No tax in P0** (decision C-1) — deliberate to match the official mockup; tax is a P3
  add-on (`taxes` table + a third journal leg).
- **No stock/inventory valuation** — "Goods" are not quantity-tracked (out of scope).
- **Corrections are via cancel/reverse, not edit** of a posted entry — simple and safe, but
  no partial edit of a posted document.
- **Single company / single currency** — no multi-company or FX (bonus, not required).
- **Budget "Achieved"** is derived from confirmed Bill/Invoice line analytics within the
  period (C-4) — documented; to confirm during the budget phase.
- **Sequence gaps possible** if a create transaction rolls back after incrementing — normal
  and acceptable (numbers are identifiers, not a gapless legal series here).

## 8. Decisions log (labeled)

- `[C-1]` No tax in P0 (mockup-aligned). `[C-2]` Keep `Contact.type`.
- `[ENGINEERING]` Single ledger for all documents. `[ENGINEERING]` Separate commercial docs
  (PO/SO/Bill/Invoice) rather than one unified move table — clearer 1-1 mapping to the mockup
  and safer for a 24h build.
- `[ENGINEERING]` `NumberSequence` table for concurrency-safe numbering.
- `[ENGINEERING]` `createdById`/`responsibleId` are un-FK'd audit stamps set by the service
  from the authenticated user. This keeps Prisma's migration/drift detection clean (Prisma
  models FKs but not the CHECK constraints/triggers in `constraints.sql`); promote them to
  Prisma relations if strict referential integrity is later wanted.
- `[ENGINEERING]` Auth uses **DB-backed sessions** (`Session` table): a random token to the
  client, only its SHA-256 hash stored; deleting the row = logout. bcrypt password hashes.
- `[ENGINEERING]` **Single posting path:** `postEntry()` is the only sanctioned way to create
  a POSTED entry, and the DB enforces the shape — entries may only be INSERTed as DRAFT
  (trigger `uf_entry_insert_draft_only`); POSTED is reached only via the balance-validated
  transition. No caller can bypass the invariant. See `docs/posting.md`.
- `[ENGINEERING]` Derive Budget achieved/%, and account balances, at query time; store only
  drift-proof caches.
- `[ENGINEERING]` Enforce INV-1/INV-6 with DB triggers **and** the service (defense in depth).
