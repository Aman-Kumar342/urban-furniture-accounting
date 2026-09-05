# Sales Flow — Module Notes (SO → Invoice → Payment)

> Reviewer-defensible notes. Code: `src/server/services/{salesOrder,invoice,payment,contact,
> product}.service.ts`, `sales.calc.ts`, `src/server/validation/sales.ts`,
> `src/app/api/{contacts,products,sales-orders,invoices,payments}/*`.

## The accounting (verified on live HTTP, no tax — C-1)
```
Invoice confirm (Sales journal, entry number = invoice number, e.g. Inv/2026/008):
    Debtors A/c        Dr 25000.00        (partner = customer)
    Sales Income A/c              Cr 25000.00

Payment / Receive (Bank or Cash journal, entry PAY/2026/NNN):
    Bank A/c           Dr 25000.00        (partner = customer)
    Debtors A/c                   Cr 25000.00
=> invoice: status PAID, amountPaid 25000, amountDue 0
```
Both entries are created **only** through `postEntry()`.

## 1. Requirement satisfied
PS/mockup quote-to-cash: SO → Customer Invoice (from SO) → confirm posts the JE → Payment
(Receive) allocates and updates status. Roles: Accountant/Admin record; Contact reads own only.

## 2. Business logic / invariants
- `lineTotal = round2(qty × unitPrice)`, `amountTotal = Σ lineTotal` (Decimal).
- SO: DRAFT → CONFIRMED. Invoice created **only from a CONFIRMED SO**, once (`salesOrderId` unique).
- Invoice: DRAFT → CONFIRMED (posts JE via `postEntry`); confirm is DRAFT-only (no double post).
- Payment: invoice must be CONFIRMED; amount > 0 and **≤ amountDue (no overpayment)**;
  status derived (NOT_PAID/PARTIAL/PAID); DB CHECKs `doc_due_eq`/`doc_status_consistent` backstop.

## 3. Database impact
No schema change. Writes `Contact`, `ProductCategory`, `Product`, `SalesOrder(+Line)`,
`CustomerInvoice(+Line)`, `Payment`, `PaymentAllocation`, `JournalEntry(+Item)` (via postEntry),
`NumberSequence`.

## 4. API endpoints
`POST/GET /api/contacts`, `POST/GET /api/products`, `POST/GET /api/sales-orders`,
`POST /api/sales-orders/:id/confirm`, `POST /api/sales-orders/:id/invoice`,
`GET /api/invoices`, `GET /api/invoices/:id`, `POST /api/invoices/:id/confirm`,
`POST /api/payments`. Consistent `{ error: { code, message } }` envelope; correct status codes.

## 5. Security
Staff-only writes (`requireStaff`); invoice reads scoped for CONTACT to their own `contactId`
(cross-access → 404). No accounting logic in routes/UI — services only.

## 6. Atomicity (the key point)
The **entire payment** — create Payment → `postEntry(Dr Bank/Cash / Cr Debtors)` → allocation →
invoice amount/status update — runs in **one `prisma.$transaction`**, and `postEntry(input, tx)`
uses that **same client** (not a nested transaction). Any failure rolls back everything. The
invoice row is `SELECT … FOR UPDATE` locked so concurrent payments can't both consume amountDue.

## 7. Validation
Zod at the boundary (qty > 0, price ≥ 0, amount > 0, uuids); domain guards in services;
DB CHECKs/triggers as the last line.

## 8. Tests (31 total, all green)
Unit: money (3), assertBalanced (5), sales.calc + schemas (5), password (4). Integration
(real DB): postEntry (5); **Sales flow (8)** — invoice posts Dr Debtors/Cr Sales Income &
balanced; full payment posts Dr Bank/Cr Debtors → PAID; partial → PARTIAL then PAID;
overpayment rejected **with no partial write**; pay-unconfirmed rejected; double-confirm
rejected; invoice-from-unconfirmed-SO rejected; Contact ownership enforced.

## 9. Reviewer demo flow
Login (accountant) → create customer + product → SO (25000) → confirm → invoice → confirm
(show JE = Dr Debtors / Cr Sales Income) → payment BANK 25000 (show JE = Dr Bank / Cr Debtors,
invoice PAID) → overpayment attempt → 422. (Scripted end-to-end and verified.)

## 10. Known gaps / next
No UI yet (API + tests only); standalone invoices (without an SO) not supported; cancellation/
credit notes later; no tax (P3). **Next:** Purchase flow (mirror), then Reports (Balance Sheet
/ P&L derive from this ledger), then the React UI.
