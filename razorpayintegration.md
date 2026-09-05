# Razorpay (Test Mode) Payment Integration — Plan

> **STATUS: PLANNING ONLY — NOT IMPLEMENTED.** No code, schema, routes, services, UI,
> `package.json`, or env files have been changed for Razorpay. This document is the reviewed
> scope + architecture to be approved before any implementation. Companion to
> `docs/sales-flow.md` (the existing Payment/accounting flow this must reuse).

---

## Goal (the desired end-to-end flow)
A **Contact / customer** can:
Login → view **their own** invoices → see amountPaid / amountDue / status → click **Pay Now**
→ open Razorpay Checkout → complete a **TEST** payment → return to the app → **server verifies**
the Razorpay payment → the **existing** Payment flow runs → `postEntry()` posts **Dr Bank / Cr
Debtors** → invoice `amountPaid/amountDue/status` update → customer sees confirmation.

**Razorpay must gate, not replace, accounting.** Only `registerPayment()` → `postEntry()` may
create accounting records — never a second/parallel payment system.

---

## 1. Current Razorpay integration status → **NOT IMPLEMENTED**
Verified in-repo (no assumptions):
- **Package:** none (`package.json` has no `razorpay`).
- **Env/keys:** `.env.example` has only `DATABASE_URL`, `NODE_ENV` — no Razorpay keys.
- **Code/routes/schema:** `grep -ri razorpay` over `.ts/.tsx/.json/.prisma/.env*` → **0 references**.
  No gateway fields on `Payment`/`PaymentAllocation`, no webhook route, no checkout component.
- **Frontend:** only scaffold `page.tsx` + `layout.tsx` — **no Contact portal / My-Invoices UI exists**.
- **Reusable core that exists:** `registerPayment(input, userId?)` (invoice→RECEIVE, Dr Bank/Cr
  Debtors, allocation, status, one transaction, overpayment-guarded, `SELECT … FOR UPDATE` on the
  invoice), `getInvoiceForUser` (Contact ownership → 404), `postEntry`, `PaymentAllocation`
  (invoice XOR bill, unique per doc), seeded Bank/Debtors accounts + Bank journal.

**Clean slate on Razorpay; solid accounting core to plug into.**

## 2. PS scope justification
- **Not required / not named** by the official PS/mockup (mockup payment is Cash/Bank only).
- **Directly supports** the PS line *"Contact can view their own invoice/bills and make payment"* —
  Razorpay is the *make-payment* mechanism for the Contact portal.
- **Verdict:** optional enhancement / demo differentiator that must plug into existing accounting.

## 3. Exact architecture
```
Contact (portal) ──login──▶ My Invoices ──open──▶ Invoice Detail  [Pay Now if amountDue>0]
   │
   ▼ POST /api/invoices/:id/payment-order            (Contact; ownership-checked)
   server: amount = invoice.amountDue (NEVER from client);
           Razorpay Orders API (KEY_SECRET, server-side);
           insert PaymentGatewayOrder(status=CREATED, razorpayOrderId);
           return { orderId, keyId(public), amount, currency, invoice info }
   │
   ▼ Razorpay Standard Checkout (browser, keyId only) ──test payment──▶ { order_id, payment_id, signature }
   │
   ▼ POST /api/payments/razorpay/verify              (Contact)
   server: load gateway order by razorpayOrderId → assert order.contactId == user.contactId;
           verify HMAC(order_id|payment_id, KEY_SECRET) == signature;
           (optional) fetch Razorpay payment → assert status=captured + amount + currency=INR;
           settleGatewayPayment()  ── idempotent, ONE transaction:
               lock gateway-order row; if status==PAID → return existing (no double);
               registerPayment({ invoiceId, method:"BANK", amount: order.amount }, contactUserId, tx)
                   → postEntry(tx):  Dr Bank / Cr Debtors
                   → PaymentAllocation(invoice)
                   → invoice amountPaid / amountDue / status  (NOT_PAID→PARTIAL→PAID)
               mark order PAID; set razorpayPaymentId + paymentId
   │
   ▼ UI: success (paymentId, amount, invoice #, updated status)

(Optional, production-grade) POST /api/webhooks/razorpay → same idempotent settleGatewayPayment()
```
**`settleGatewayPayment()` is the single settlement path; both the verify-callback and the webhook
call it.** Razorpay never touches accounting directly — only `registerPayment()` does.

## 4. Required DB changes — ONE additive table (approval needed)
The existing `Payment` cannot safely support Razorpay idempotency alone (it's created only *after*
success, so it can't track order lifecycle or block duplicate callbacks/webhooks). Add a dedicated
table and keep `Payment` clean.

**`PaymentGatewayOrder`**
| Field | Notes |
|---|---|
| `id` | PK |
| `provider` | enum `RAZORPAY` |
| `invoiceId` → CustomerInvoice | target invoice |
| `contactId` → Contact | payer = invoice.customerId (ownership) |
| `amount` `Decimal(14,2)`, `currency` default `"INR"` | server-derived at order time |
| `razorpayOrderId` **@unique** | idempotency on the order |
| `razorpayPaymentId` String? **@unique** | a gateway payment settles once (can't apply to two invoices) |
| `paymentId` String? **@unique** → Payment | one order → at most one internal Payment |
| `status` | enum `CREATED / PAID / FAILED / EXPIRED` |
| `createdAt / updatedAt / expiresAt?` | |

Indexes: `invoiceId`, `contactId`, `status`. **No gateway fields on `Payment`** — link via
`PaymentGatewayOrder.paymentId` (optionally a `Payment.provider` default `MANUAL` later for reports).

**Migration impact:** additive table + 2 enums; **no change to existing tables**; low risk; one new
migration; constraints/triggers untouched.

**One behavior-preserving code change (approval needed):** generalize
`registerPayment(input, userId?)` → `registerPayment(input, userId?, tx?)` (mirror `postEntry`'s
optional `tx`) so settlement is atomic in one transaction. Existing callers pass no `tx` →
**unchanged behavior; all 77 tests stay green.**

## 5. Required APIs
| Endpoint | Auth | Purpose |
|---|---|---|
| `POST /api/invoices/:id/payment-order` | Contact (ownership via `getInvoiceForUser`) | derive amount from `amountDue`; create Razorpay order + `PaymentGatewayOrder`; return orderId + public keyId |
| `POST /api/payments/razorpay/verify` | Contact | verify signature + idempotent settle |
| `POST /api/webhooks/razorpay` | none (verified by webhook secret) | reliable settlement; same idempotent path |
| *(reuse)* `GET /api/invoices/:id` | Contact (own) | already returns invoice + allocations = payment history |

Staff endpoints and the manual `POST /api/payments` are untouched.

## 6. UI integration points (future; not built now)
```
Contact Portal → My Invoices → Invoice Detail
   ├─ number / total / amountPaid / amountDue / status / payment history (GET /api/invoices/:id)
   └─ [Pay Now] (amountDue>0) → POST payment-order → Razorpay Checkout(keyId, orderId)
         success → POST verify → Payment Success (paymentId, amount, invoice#, new status)
         failure → Payment Failed (safe reason) + Retry ; invoice unchanged
         cancel  → Payment Cancelled ; invoice unchanged
Security proof: Contact cannot open another customer's invoice (404).
```

## 7. Payment state machine (Razorpay state ≠ invoice state)
```
Invoice:       NOT_PAID ─(verified full)─▶ PAID ; ─(verified partial)─▶ PARTIAL ─▶ PAID
GatewayOrder:  CREATED ─(verified+captured)─▶ PAID
                       ├─(failed)─▶ FAILED        (invoice UNCHANGED)
                       └─(never paid/expired)─▶ EXPIRED
Checkout closed / payment failed / signature-verify failed → invoice + ledger UNCHANGED.
ONLY  CREATED→PAID + signature valid + captured  → registerPayment() runs.
```

## 8. Security & idempotency strategy
**Security:** amount always `= invoice.amountDue` server-side (client amount ignored); `invoiceId`
resolved via `getInvoiceForUser` (Contact pays only their own, else 404); `KEY_SECRET` /
`WEBHOOK_SECRET` server-only (browser gets `keyId` only); **verify HMAC signature server-side** with
**our** `razorpayOrderId`; optionally fetch the payment from Razorpay and assert
`status=captured` + amount + `currency=INR`; a raw frontend "success" is **never** proof.

**Idempotency (exactly one Payment / allocation / JournalEntry):**
- `razorpayOrderId` unique → order tracked once.
- `razorpayPaymentId` unique → a Razorpay payment settles only one order.
- `paymentId` unique on the gateway order → one order → one internal Payment.
- `settleGatewayPayment()` locks the gateway-order row (`SELECT … FOR UPDATE`); if `status=PAID`
  already → return existing, no second accounting.
- Whole settle (mark PAID + `registerPayment(tx)` + link) in one transaction (all-or-nothing).
- Duplicate callback **and** duplicate webhook both hit the same guard → first wins, rest no-op.

## 9. Failure handling (all 17 scenarios)
| # | Scenario | Razorpay | Internal Payment | JournalEntry | Invoice | UI |
|--|--|--|--|--|--|--|
|1|Checkout closed|no capture|none|none|unchanged|Cancelled|
|2|Payment fails|failed|none|none|unchanged|Failed + retry|
|3|Wrong invoiceId|—|none|none|—|404|
|4|Invoice of another contact|—|none|none|unchanged|404 (ownership)|
|5|Amount changed after order|order fixed|none (amount from order)|none|unchanged|reject|
|6|Amount mismatch (rzp vs expected)|captured|none (verify rejects)|none|unchanged|error|
|7|Invalid signature|captured|none|none|unchanged|400|
|8|Fake payment id|—|none (sig fails)|none|unchanged|400|
|9|Wrong order id|—|none (not our order/owner)|none|unchanged|404|
|10|Duplicate callback|captured once|1 (guard)|1|updated once|success (same)|
|11|Duplicate webhook|captured once|1 (guard)|1|updated once|n/a|
|12|Already-paid invoice|—|none (amountDue 0 → assertPayable rejects)|none|unchanged|already paid|
|13|Partial payment|captured|1|1|→PARTIAL|success|
|14|Concurrent attempts|—|1 (row locks on order + invoice)|1|consistent|one wins|
|15|Rzp ok but our tx fails|captured|rolled back|rolled back|unchanged|error → webhook/retry settles later|
|16|Webhook before callback|captured|1 (webhook settles)|1|updated|callback returns already-settled success|
|17|Callback arrives multiple times|—|1 (guard)|1|updated once|success|

## 10. Webhook strategy (recommendation)
Options: (1) checkout handler only, (2) server verification + handler, (3) server verification +
webhook, (4) verification + webhook + reconciliation.
- **Recommended target: (3)** — server signature verification on the callback for **immediate UI
  success**, PLUS a webhook as the **reliable** settlement path; both call the same idempotent
  `settleGatewayPayment()`.
- **For a LOCAL hackathon demo:** the **callback-verification path is primary** (webhooks can't
  reach `localhost` without a tunnel like ngrok). The webhook is the production reliability layer.
- Never treat a frontend "success" alone as proof — always server-verify.

## 11. Test plan
- **Unit:** signature verify (valid/invalid); rupee→paise conversion; state-machine transitions;
  idempotency guard (pure).
- **Integration (real DB, Razorpay mocked):** create order (amount=amountDue, ownership enforced);
  verify success → exactly **one** Payment + allocation + JE (Dr Bank/Cr Debtors) + correct status;
  invalid signature → nothing; duplicate callback → still one; duplicate webhook → still one;
  partial→full → PARTIAL→PAID; already-paid → rejected; cross-contact → 404; tx-fail rollback →
  nothing persisted.
- **Regression:** all **77** existing tests green; manual staff `POST /api/payments` unchanged.
- **Real Razorpay Test Mode (manual):** one end-to-end test-card payment through Checkout → verify → PAID.

## 12. Reviewer demo (60–90s)
Login as Contact → My Invoices → open own invoice (Amount Due) → **Pay Now** → Razorpay **Test**
Checkout → pay with test card → back to app → **Payment Success** (paymentId, amount) → invoice
**PAID** → show the **Payment record** + **Journal Entry: Dr Bank / Cr Debtors** → show Contact
**cannot** open another customer's invoice (404). *Failure path:* cancel Checkout → "Cancelled",
invoice unchanged.

## 13. Environment / secrets
`.env` (local, gitignored) — Test Mode keys only:
```
RAZORPAY_KEY_ID=rzp_test_xxx        # public-ish; sent to browser for Checkout
RAZORPAY_KEY_SECRET=xxx             # SERVER ONLY — never sent to browser
RAZORPAY_WEBHOOK_SECRET=xxx         # SERVER ONLY — webhook signature verification
```
Add the same keys (placeholders) to `.env.example`. Never expose the secret key to the client.

## 14. Recommended implementation order
1. Env keys + Razorpay SDK; `PaymentGatewayOrder` migration; behavior-preserving `registerPayment(tx?)`
   refactor (+ full regression run).
2. `settleGatewayPayment()` (idempotent) + unit tests.
3. `POST /invoices/:id/payment-order` + `POST /payments/razorpay/verify` (+ integration tests, Razorpay mocked).
4. (Optional/robust) `POST /webhooks/razorpay` → same settle path.
5. Contact-portal UI (My Invoices → Pay Now → Checkout → success/failure).
6. Manual Razorpay Test-Mode end-to-end + reviewer rehearsal.

## 15. Risks / what could break existing accounting
- **Nested transactions** if `registerPayment` isn't `tx`-aware → breaks atomicity/idempotency.
  *Mitigation:* the optional-`tx` refactor (behavior-preserving).
- **Double settlement** from callback+webhook → duplicate JE. *Mitigation:* row lock + unique
  constraints (`razorpayOrderId` / `razorpayPaymentId` / `paymentId`).
- **Amount drift / paise rounding** (Razorpay uses integer paise) → wrong ledger amount.
  *Mitigation:* amount from `amountDue`, convert `×100`, verify equality.
- **Webhooks can't reach localhost** in a local demo → settlement stalls if relied upon.
  *Mitigation:* callback-verification is the primary demo path; webhook needs a tunnel (production layer).
- **Overpayment / already-paid races** → `registerPayment`'s existing `FOR UPDATE` + `assertPayable`
  already guard this; reused unchanged.
- **Scope creep into a parallel payment system** → explicitly avoided: Razorpay only gates;
  `registerPayment` / `postEntry` remain the sole accounting path.

---

## Approvals required before any code
1. Add the **`PaymentGatewayOrder`** table (additive, low-risk).
2. The **behavior-preserving `registerPayment(input, userId?, tx?)`** refactor.
3. Webhook decision for the demo: **callback-verify only** (simplest, local-demo-friendly) **or**
   **+ webhook** (needs a public tunnel).

**No implementation until the above are explicitly approved.**
