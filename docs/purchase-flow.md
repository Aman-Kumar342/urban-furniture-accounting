# Purchase Flow — Module Notes (PO → Bill → Payment)

> Mirror of Sales, reusing `postEntry()`, numbering, Decimal money, the transaction-client
> pattern, allocation, row locking, state-machine guards, RBAC, and error handling.
> Code: `purchaseOrder.service.ts`, `bill.service.ts`, generalized `payment.service.ts`,
> `validation/purchase.ts`, `src/app/api/{purchase-orders,bills,payments}/*`.

## The accounting (verified on live HTTP, no tax — C-1)
```
Bill confirm (Purchase journal, entry number = bill number, e.g. Bill/2026/0009):
    Purchase Expense A/c  Dr 15000.00     (partner = vendor)
    Creditors A/c                    Cr 15000.00

Vendor Payment / Send (Bank or Cash journal, entry PAY/2026/NNN):
    Creditors A/c         Dr 15000.00     (partner = vendor)
    Bank A/c                         Cr 15000.00
    => bill: status PAID, amountPaid 15000, amountDue 0
```
Both posted **only** through `postEntry()`. This is the exact mirror of Sales.

## The whole engine now (both sides)
```
SALES     Invoice:  Dr Debtors          / Cr Sales Income
          Payment:  Dr Bank/Cash        / Cr Debtors
PURCHASE  Bill:     Dr Purchase Expense / Cr Creditors
          Payment:  Dr Creditors        / Cr Bank/Cash
```

## Generalized payment — direction is server-derived (not trusted from the client)
`registerPayment` settles exactly ONE document and derives direction from it:
- `invoiceId` → **RECEIVE** → Dr Bank/Cash, Cr Debtors
- `billId` → **SEND** → Dr Creditors, Cr Bank/Cash

**Exactly one of `invoiceId`/`billId`** is enforced at three layers: Zod refine (400), a
service guard (422), and the DB CHECK `alloc_target_xor` on `PaymentAllocation`.

## Lifecycle & invariants
PO DRAFT→CONFIRMED; bill created only from a CONFIRMED PO (once, `purchaseOrderId` unique);
bill confirm posts the JE (DRAFT-only, no double post); vendor payment requires a CONFIRMED
bill, amount > 0 and **≤ amountDue** (no overpayment); status derived NOT_PAID→PARTIAL→PAID.

## Atomicity & concurrency
The whole vendor payment — Payment create → `postEntry(Dr Creditors / Cr Bank/Cash)` →
allocation → bill amount/status update — runs in ONE `prisma.$transaction` with the same
client (`postEntry(input, tx)`, no nested transaction). The bill row is `SELECT … FOR UPDATE`
locked against concurrent payments.

## Database impact
**No schema change.** `PurchaseOrder(+Line)`, `VendorBill(+Line)` (expense `accountId`),
`Payment.direction`, and `PaymentAllocation.billId` already existed. Uses `NumberSequence`
for `PO`/`BILL`/`PAY`.

## API endpoints
`POST/GET /api/purchase-orders` · `POST /api/purchase-orders/:id/confirm` ·
`POST /api/purchase-orders/:id/bill` · `GET /api/bills` · `GET /api/bills/:id` ·
`POST /api/bills/:id/confirm` · `POST /api/payments` (now handles invoice XOR bill).

## Security
Staff-only writes; bill reads scoped for CONTACT to their own `vendorId` (cross-access → 404);
no accounting logic in routes/UI.

## Tests (41 total, all green)
Purchase integration (10): bill posts Dr Purchase Expense/Cr Creditors & balanced; full
vendor payment posts Dr Creditors/Cr Bank → PAID (**direction SEND**); partial → PARTIAL→PAID;
overpayment rejected **with no partial write**; pay-unconfirmed-bill rejected; double-confirm
rejected; bill-from-unconfirmed-PO rejected; vendor ownership enforced; payment targeting both
or neither document rejected. Sales suite (8) still green (regression preserved).

## Reviewer demo flow
Login → vendor + product → PO (15000) → confirm → bill → **confirm → JE Dr Purchase Expense /
Cr Creditors** → pay BANK 15000 → **JE Dr Creditors / Cr Bank, bill PAID** → overpayment → 422.

## Known gaps / next
No UI yet; standalone bills (no PO) unsupported; cancellation/debit notes later; no tax (P3).
**Next: Reports** — Balance Sheet + P&L derived from the ledger that Sales and Purchase now
produce (the payoff: post a sale/purchase, watch the reports move).
