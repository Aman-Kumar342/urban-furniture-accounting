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

- **Database:** PostgreSQL (local) — per hackathon rules, no BaaS
- **Backend / Frontend:** being finalized

## Getting started

_Setup instructions will be added once the stack is finalized._

## Repository layout

```
db/       SQL schema, migrations, seed data
docs/     ERD and design notes
```
