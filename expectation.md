# Hackathon Expectations

> How this project scores extremely well. This document maps our engineering choices
> to the evaluation criteria so every decision is judge-defensible. Read alongside
> `problemstatement.md` (what we build) and `guidelines.md` (how we build).

**Evaluation priority order (from the organizers):**
1. **Database Design — highest priority** 2. Coding Standards 3. Logic
4. Modularity 5. Frontend Design 6. Performance 7. Scalability 8. Security
9. Usability 10. Debugging Skills 11. Attention to Detail.

---

## 1. Evaluation Strategy

Win on **depth, not breadth**. A smaller system that is correct, dynamic, and
defensible beats a large shallow one. Our three anchors:
1. **An elegant, normalized data model** with a single ledger as the source of truth.
2. **Real double-entry accounting** where the Balance Sheet provably balances.
3. **A demo that visibly changes the financial state** — nothing faked.

Everything below is evidence a judge can *see* and we can *explain*.

## 2. Database Design — Highest Priority

What a judge should be able to see and probe:

- **Relational modeling:** clear entities with correct cardinality (see ERD). The key
  insight to showcase: **all documents (invoices, bills, payments) post into ONE
  ledger** (`journal_entries` + `journal_items`). One elegant model, many sources.
- **Normalization:** categories, taxes, analytic accounts, and CoA are their own
  tables (no repeated strings); 3NF where it matters, with deliberate, explained
  exceptions.
- **Relationships & keys:** every FK named and enforced; self-referencing hierarchy on
  `accounts` (parent_id); N–N payment↔document via `payment_allocations`.
- **Constraints:** `CHECK` constraints for money ≥ 0 and debit-XOR-credit; `UNIQUE` on
  emails, account codes; `NOT NULL` on required fields; enums for types/states.
- **Indexes:** on all FKs, on `journal_items(account_id)`, on document `state` and
  `date` used by reports/filters — with a one-line reason for each.
- **Transaction integrity:** multi-row postings wrapped in a single DB transaction
  (`prisma.$transaction`) so the ledger is never half-written.
- **Accounting consistency:** DB + service both guard `Σ debit = Σ credit`.
- **Auditability:** `created_at`, `updated_at`, `created_by` on transactional tables;
  posted entries immutable.
- **Extensibility:** adding a new document type (e.g., credit note) needs no ledger
  schema change — it just posts entries.
- **ERD:** one clean diagram in `docs/` we can walk through in 60 seconds.

**Judge test we want to pass:** "Show me how a sale becomes accounting data." We open
the invoice, show the posted `journal_entry` and its `journal_items`, and show the same
rows moving the Balance Sheet.

## 3. Business Logic (demonstrate real logic, not screens)

- **Double-entry posting engine:** a single `postEntry()` service that every flow uses;
  rejects unbalanced entries.
- **Invoice/Bill calculation:** line net = qty × unit price; tax = net × rate; totals
  aggregate lines; stored to `NUMERIC(14,2)`.
- **Payment allocation:** payments allocate to one or more documents; `amount_due`
  recomputed; status derived (`OPEN/PARTIALLY_PAID/PAID`); over-allocation rejected.
- **Tax calculation:** sales tax → Output Tax (liability); purchase tax → Input Tax
  (asset).
- **Ledger updates:** account balances = grouped sum of journal items (never stored
  denormalized without derivation).
- **Financial reporting:** Balance Sheet and P&L computed from journal items by account
  type; net profit ties P&L to the Balance Sheet.
- **Budget calculation:** actual = sum of transactions tagged to an analytic account in
  the period; compared to planned.

## 4. Architecture

Single Next.js application, cleanly layered:

```
UI (React Server/Client Components, Tailwind)
  → Route Handler (/app/api/*, thin: parse + authorize + delegate)
    → Service / Domain layer (business rules, accounting invariants, orchestration)
      → Repository (data-access functions)
        → Prisma Client
          → PostgreSQL
```
- **App Router** for pages and API route handlers in one deployable.
- **Services** own accounting rules; **repositories** own queries; **route handlers**
  stay thin.
- **Zod** schemas validate every request body and are shared with the client.
- **RBAC** enforced in a server-side authorization helper used by every protected route.
- Deployment: one VPS, Nginx → Next.js (PM2) → local PostgreSQL, one domain.

## 5. API Quality

- **REST-style routes:** `/api/invoices`, `/api/invoices/:id/post`,
  `/api/payments`, `/api/reports/balance-sheet`, etc.
- **HTTP status codes:** 200/201 success, 400 validation, 401 unauthenticated,
  403 forbidden, 404 not found, 409 conflict (e.g., double-post), 422 domain rule
  violation, 500 unexpected.
- **Validation:** Zod on every input; typed responses.
- **Authorization:** role + ownership checked before any work.
- **Consistent errors:** one error envelope `{ error: { code, message, details? } }`.
- **Predictable responses:** consistent shape, pagination metadata on lists.

## 6. Frontend / UI / UX

Looks and behaves like a serious ERP:
- **Dashboard:** live KPI cards (AR outstanding, AP outstanding, cash/bank balance,
  period revenue) from real queries.
- **Navigation:** persistent sidebar/topbar grouping Master Data, Sales, Purchases,
  Accounting, Reports; consistent spacing.
- **Forms:** inline Zod-backed validation, clear labels, sensible defaults, disabled
  submit while pending.
- **Tables:** sortable/filterable lists with pagination, status badges, currency
  formatting.
- **Filters:** period and status filters on documents and reports.
- **States:** explicit loading skeletons, empty states, and error states everywhere.
- **Confirmations:** destructive/irreversible actions (post, archive, pay) confirm.
- **Design system:** one color palette, one set of components (button, input, table,
  badge, card), consistent typography.

## 7. Security

- **Authentication:** email + hashed password (bcrypt/argon2); secure session/JWT.
- **RBAC:** Admin / Accountant / Contact; permissions enforced **server-side**.
- **Authorization:** ownership checks — a Contact only reaches their own documents.
- **Input validation:** Zod on server (never trust the client); parameterized queries
  via Prisma (no SQL injection).
- **Sanitization:** escape/handle user text in outputs.
- **Secrets:** `.env` only, never committed; `.env.example` documents keys.
- **Restricted Contact access:** every Contact-facing query filtered by their
  `contact_id`; verified with a negative test.
- **Server-side permission enforcement:** the UI hides actions, but the API is the real
  gate.

## 8. Performance

- **Indexes** on FKs and report/filter columns.
- **Pagination** on all list endpoints.
- **Efficient aggregation:** reports use `GROUP BY`/`SUM` in SQL, not app-side loops.
- **Query optimization:** select only needed columns; use Prisma `include` deliberately.
- **Avoid N+1:** batch/`include` related rows; no per-row queries in loops.
- **Sensible API calls:** the client fetches what a screen needs, no waterfalls.

## 9. Git & Collaboration

- Feature branches per module; PRs reviewed before merge to `main`.
- **Every team member has meaningful, attributed commits** — split by module
  (see `guidelines.md` §13 and the roadmap).
- Small, descriptive commits (one logical change each); no single giant final commit.
- No secrets in history.

## 10. Dynamic Data

- All data persists in PostgreSQL; the UI reads/writes through the API.
- Static JSON is only allowed as throwaway scaffolding during early dev, never in the
  demo path.
- The proof: post a transaction live and every report/KPI updates from the database.

## 11. Testing & Debugging

Focus tests where correctness matters most:
- **Accounting:** posting produces balanced entries (INV-1..INV-3); report math.
- **Transactions:** SO→Invoice→Payment and PO→Bill→Payment end-to-end.
- **Validation:** bad inputs rejected (email, negatives, over-allocation, unbalanced).
- **Permissions:** Contact cannot access others' data; Accountant cannot manage users.
- **Reports:** Balance Sheet balances; P&L ties to it; Budget actuals correct.
- **Edge cases:** partial payments, zero-tax lines, archived master data still shown on
  historical documents.
- **Debugging:** clear server error logs; consistent error envelope makes failures
  legible during the demo.

## 12. Winning Demo Strategy (the narrative)

One coherent business story, ~5 minutes:
```
1. Log in as Admin → show dashboard (starting state).
2. Create master data: a Contact (customer + vendor), a Product, confirm CoA + Journals seeded.
3. PURCHASE: create PO for a vendor → convert to Vendor Bill → POST → show the
   balanced journal entry (Dr Purchase Expense / Cr Creditors) → register Bank payment.
4. SALES: create SO for a customer → generate Customer Invoice → POST → show the
   balanced entry (Dr Debtors / Cr Sales Income / Cr Output Tax) → receive Cash payment.
5. Open Balance Sheet → Assets = Liabilities + Capital, ties out.
6. Open P&L → net profit = Income − Expenses, equals retained earnings on the BS.
7. Open Budget Report → planned vs actual for an analytic account.
8. Log in as a Contact → show they see ONLY their own invoice and can pay it,
   nothing else (security proof).
```
Every step produces a **visible, correct** result before moving on. The judges should
leave certain that transactions truly change the financial state.

## 13. Difficult Judge Questions (and where our evidence lives)

| Question | Evidence in our implementation |
|---|---|
| "Show me your data model." | ERD in `docs/`; single ledger design; FKs/constraints/indexes in `schema.prisma`. |
| "How do you guarantee debits = credits?" | `postEntry()` service validates INV-1 before commit; DB `CHECK` on items; wrapped in `$transaction`. |
| "What happens if posting half-fails?" | `prisma.$transaction` rolls back; AC-10 test; no partial rows. |
| "Is the Balance Sheet real?" | Computed live from `journal_items` grouped by account type; we post a transaction and it moves. |
| "Why does the Balance Sheet balance?" | Accounting equation; net profit from P&L flows into Capital; INV-4. |
| "How is money stored?" | `NUMERIC(14,2)`; no floats; rounding at line level. |
| "How do you stop a customer seeing others' invoices?" | Server-side RBAC + ownership filter by `contact_id`; negative test AC-9. |
| "Where is business logic?" | Service/domain layer, not components or route handlers; show the module. |
| "How does this scale?" | Indexed ledger, paginated APIs, grouped aggregations, layered architecture; add document types without ledger schema change. |
| "How do you validate input?" | Zod at the API boundary + DB constraints; client mirrors for UX only. |
| "How is it deployed?" | One Next.js app behind Nginx via PM2, local PostgreSQL, one domain. |
| "What would you build next?" | Credit notes, General Ledger drill-down, PDF invoices, multi-currency (roadmap). |
