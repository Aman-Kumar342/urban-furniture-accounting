# Urban Furniture — Accounting System

A double-entry accounting system that turns master data into recorded transactions and
real-time financial reports. Built for the Odoo Hackathon, with a **clean, normalized data
model and provably correct accounting** as the first priority: every transaction posts
balanced journal entries, and the **Balance Sheet always balances** (Assets = Liabilities + Capital).

**Live demo:** https://urbanfurniture.69.62.76.226.sslip.io

---

## What it does

- **Master data** — Contacts (Customer / Vendor / Both), Products (+ categories),
  Chart of Accounts, Journals, Analytic Accounts, Budgets.
- **Transaction flows** — Sales Order → Customer Invoice → Payment, and
  Purchase Order → Vendor Bill → Payment.
- **Double-entry posting** — confirming a document posts a balanced journal entry
  (Σ debit = Σ credit). Posted entries are immutable.
- **Real-time reports** — Profit & Loss, Balance Sheet, and Budget Report, all derived
  read-only from the posted ledger.
- **Customer portal** — a contact signs in and sees only their own invoices and bills.

---

## Why the data model is the core

The schema is the source of truth; the app is a thin, well-layered shell over it.

- **24 Prisma models** (`prisma/schema.prisma`) — accounts, journals, journal entries and
  items, orders, invoices/bills, payments and allocations, budgets, analytic accounts,
  number sequences, users and sessions.
- **Money** is `Decimal(14,2)` end to end — never a float. Client code works in integer cents.
- **Database-enforced integrity** (`db/constraints.sql`, applied after migrations) — CHECK
  constraints (debit XOR credit, amounts ≥ 0, non-zero lines) and triggers that reject an
  unbalanced or mutated posted entry at the database level, independent of the application.
- See `docs/ERD.md` and `docs/database-design.md` for the ERD, invariants, transaction
  boundaries, and index strategy.

### Accounting guarantees

- `postEntry()` is the **single** posting path; it validates balance and writes the entry
  and its items atomically.
- Posted entries are **balanced and immutable** — no PATCH/DELETE route exists for them.
- **Payment direction** (RECEIVE vs SEND) is derived on the server from the document; the
  client never sends it.
- Payments are **atomic and row-locked**; document numbering is **concurrency-safe** via a
  dedicated sequence table.
- Reports are **projections of the ledger**; budget "achieved" is derived on the backend
  from confirmed documents. No business math lives in React.

---

## Architecture

One Next.js app, cleanly layered, one request path:

```
React (client) → Route Handler (/api) → RBAC guard → Zod validation → Service → Prisma → PostgreSQL
```

- **App:** Next.js 16 (App Router) + React 19 + TypeScript 5. Route groups separate the staff
  workspace `(app)` from the customer portal `(portal)`.
- **Styling:** Tailwind CSS v4 (design tokens in `globals.css`).
- **Database:** PostgreSQL 16 — local / self-hosted, no BaaS (per hackathon rules).
- **ORM:** Prisma 6 · **Validation:** Zod · **Auth:** DB-backed sessions (httpOnly cookie,
  SHA-256 token hash, bcrypt passwords) + role-based access control.

**51 API routes** cover auth, master data, both transaction flows, payments, budgets, and reports.

### Roles

| Role | Can do |
|---|---|
| **Admin** | Everything: master data (incl. create users), transactions, reports |
| **Accountant** | Master data, transactions, reports (no user management) |
| **Contact** | Read only their own invoices/bills in the portal |

RBAC is enforced in the API (`requireStaff` / `requireUser` / `requireRole`); UI guards are UX only.

---

## Getting started

Prerequisites: Node 22, PostgreSQL 16.

```bash
# 1. Install
npm ci

# 2. Configure the database
cp .env.example .env          # set DATABASE_URL to your local Postgres
createdb urbanfurniture       # or create it however you prefer

# 3. Schema → constraints → seed
npm run prisma:migrate        # apply migrations (dev)   | prod: npx prisma migrate deploy
npm run db:constraints        # CHECK constraints + ledger triggers (psql)
npm run db:seed               # chart of accounts, journals, sequences, demo users
npm run db:seed:demo          # OPTIONAL: ~205-record FY2026 business dataset (see below)

# 4. Run
npm run dev                   # http://localhost:3000
# or a production build:
npm run build && npm start
```

### Environment

`.env` holds a single required variable (see `.env.example`):

```
DATABASE_URL="postgresql://user:password@localhost:5432/urbanfurniture?schema=public"
```

### Demo accounts (from the seed)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@urbanfurniture.test` | `Admin@123` |
| Accountant | `accountant@urbanfurniture.test` | `Account@123` |
| Contact (portal) | `nimesh@urbanfurniture.test` | `Portal@123` |
| Contact (portal, demo data) | `portal@urbanfurniture.demo` | `Portal@2026` |

Dev passwords are documented, not secrets; a real deployment sets its own.

### Demo dataset (optional)

`npm run db:seed:demo` generates a coherent **FY2026 Urban Furniture business** — ~205 meaningful
records (≈23 contacts, 18 products, 6 analytic accounts, 4 budgets, 45 sales orders, 32 invoices,
30 purchase orders, 20 bills, 27 payments) spread across the year, in a realistic mix of states
(draft / confirmed / not-paid / partial / paid, plus a revised budget and archived master data).
Every transaction is created **through the real service layer**, so the accounting engine posts
all ~74 balanced journal entries itself — the generator never writes to the ledger. It is
**idempotent** (re-running never duplicates) and additive (never truncates or deletes). The
`portal@urbanfurniture.demo` account above is linked to a demo customer with invoices, so the
customer portal is populated.

`npm run verify:demo` reconciles the result: every posted entry balances, the trial balance ties
out, invoice/bill/payment amounts and statuses are consistent, budget "achieved" matches an
independent recompute, the Balance Sheet balances, and portal isolation holds.

---

## Testing

| Command | What it runs |
|---|---|
| `npm test` | **104 unit + integration tests** (vitest) against a real Postgres database |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test:e2e` | **19 end-to-end tests** (Playwright) against a production build |
| `npm run verify:demo` | reconciles the demo dataset's accounting (balances, statuses, reports) |

The E2E suite (`e2e/`) drives the real browser through:

- **Auth** — login, logout, redirects, and the real 401 error path.
- **RBAC & portal isolation** — a contact is confined to the portal, staff APIs return
  **403** to a contact session, and the portal offers no way to pay.
- **A full sale** — Sales Order → confirm → Invoice → confirm (posts Dr Debtors / Cr Sales
  Income) → receive payment (posts Dr Bank / Cr Debtors) → invoice **Paid** → and the
  **Balance Sheet still balances**.
- **Reports** — Profit & Loss, Balance Sheet, and Budget Report render.
- **Accessibility** — an `axe-core` scan of key screens fails the build on any serious/critical
  WCAG 2 A/AA violation.
- **Mobile** — the workspace and portal are usable at a Pixel 5 viewport with no horizontal overflow.

Playwright builds and starts the app on `:3100` automatically; it needs a migrated, seeded database.

### Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request. Two jobs, each with a
Postgres 16 service container: **(1)** typecheck + the 104 tests + production build; **(2)**
migrate + constraints + seed + build + the Playwright E2E suite (including the accessibility scan).

---

## Deployment

Reverse proxy (Caddy, HTTPS) → Next.js (PM2) → local PostgreSQL, on a single Ubuntu VPS
(Node 22). Deploy is `git pull` → `npm run build` → `pm2 restart urbanfurniture`; the app
listens on `127.0.0.1:3100` behind the proxy.

---

## Design

"**Ledger + Workshop**" — accounting rigor (ruled columns, tabular figures, clear Dr/Cr) meets
furniture-workshop warmth (deep pine navigation, a single walnut accent, a Fraunces wordmark)
on neutral drafting-paper. IBM Plex Sans carries the UI and, via tabular figures, every
financial amount. Every screen handles loading, empty, error, and success states.

---

## Scope (intentional exclusions)

To keep the build honest and correct, some mockup affordances without backend support were
deliberately left out rather than faked: tax, PDF export (the reports use the browser's print),
a product-categories manager, a users list, document editing/cancellation after creation, and
contact-initiated payments (posting is staff-only). Razorpay is planned only — see
`razorpayintegration.md`.

---

## Documentation

- `docs/ERD.md` — entity-relationship diagram, entity catalog, requirement → entity map
- `docs/database-design.md` — invariants, transaction boundaries, index strategy
- `docs/posting.md` — the `postEntry()` service (the single posting path)
- `docs/sales-flow.md` / `docs/purchase-flow.md` — each flow with its exact journal entries
- `docs/reports.md` — Balance Sheet & P&L derived from the posted ledger
- `docs/auth.md` — sessions + RBAC
- `prisma/schema.prisma` — the data model · `db/constraints.sql` — DB constraints & triggers
