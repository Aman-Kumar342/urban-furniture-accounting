# Urban Furniture — Accounting System

A double-entry accounting system for Urban Furniture that turns master data into
recorded transactions and real-time financial reports.

Built for the Odoo Hackathon. The focus is a clean, normalized data model and
correct accounting logic: every transaction posts balanced journal entries, and the
**Balance Sheet always balances** (Assets = Liabilities + Capital).

## What it does

- **Master data:** Contacts (Customer/Vendor/Both), Products, Chart of Accounts, Journals, Analytic Accounts, Budgets
- **Transactions:** Purchase Order → Vendor Bill → Payment, and Sales Order → Customer Invoice → Payment
- **Double-entry posting:** each transaction generates balanced journal entries (Σ debit = Σ credit)
- **Reports (real-time):** Balance Sheet, Profit & Loss, Budget Report

## Roles

- **Admin (Business Owner)** — create/modify/archive master data, record transactions, view reports
- **Invoicing User (Accountant)** — create master data, record transactions, view reports
- **Contact** — view only their own invoices/bills and make payments

## Tech

Single Next.js app (one VPS, one domain), cleanly layered
UI → Route Handler → Service → Repository → Prisma → PostgreSQL.

- **Frontend/Backend:** Next.js (App Router) + React + TypeScript, Route Handlers for the API
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL (local/self-hosted) — no BaaS, per hackathon rules
- **ORM:** Prisma · **Validation:** Zod · **Auth:** session + RBAC
- **Deploy:** Nginx → Next.js (PM2) → local PostgreSQL

## Docs

- `problemstatement.md` — single source of truth (what to build)
- `expectation.md` — scoring strategy vs the judging rubric
- `skill.md` — team capability checklist
- `guidelines.md` — development rulebook
- `docs/mockup-reconciliation.md` — screen-by-screen reading of the official mockup
- `docs/mockup/` — the official mockup image

## Getting started

_Setup instructions will be added once the stack is finalized._

## Repository layout

```
db/       SQL schema, migrations, seed data
docs/     ERD and design notes
```
