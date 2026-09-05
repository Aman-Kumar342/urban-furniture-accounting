# postEntry() — the Accounting Posting Service

> The correctness core. Code: `src/server/services/posting.service.ts`,
> `src/server/services/numbering.service.ts`, `src/lib/money.ts`. This is the **single
> sanctioned path** to create a POSTED journal entry; no other code may create one.

## The contract
`postEntry(input)` takes a journal, date, source, optional partner/number, and 2+ balanced
`lines` (each `accountId` + exactly one of `debit`/`credit`, plus optional partner/analytic/
label). It returns the POSTED `JournalEntry` with its items. `assertBalanced(lines)` is a
pure, exported validator (unit-tested without a DB).

## How the invariant is enforced (defense in depth)
1. **Service (primary):** `assertBalanced` enforces INV-1 (Σdebit = Σcredit) and INV-2
   (each line debit-XOR-credit, ≥0, non-zero) before any DB write.
2. **Atomic transaction:** one `prisma.$transaction` — allocate number → insert entry as
   **DRAFT** with items → **UPDATE state=POSTED**. All-or-nothing (INV-7).
3. **DB triggers (backstop, caller-agnostic):**
   - `uf_entry_insert_draft_only` — an entry can only be **INSERTed as DRAFT**, so a direct
     `create({ state: 'POSTED' })` is rejected. **This makes postEntry the only way in.**
   - `uf_journalentry_balanced` — on the flip to POSTED, re-checks Σdebit = Σcredit.
   - `uf_journalitem_immutable` / `uf_journalentry_no_unpost` — POSTED entries/items can't
     be edited or un-posted (INV-6).
4. **CHECK constraints:** `ji_debit_xor_credit`, non-negative money, non-zero line.

Money is `Prisma.Decimal` throughout (`src/lib/money.ts`) — never a JS float.

## Numbering
`nextNumber(tx, key, year?)` allocates human-readable numbers (`JE/2026/0001`, `Inv/2026/001`,
`Bill/2026/0001`, `SO00001`, …) via an atomic `INSERT … ON CONFLICT DO UPDATE … RETURNING`,
which increments under a row lock — concurrency-safe, no collisions. Runs in the caller's tx.

---

## Reviewer defensibility (10-point)
1. **Requirement:** the double-entry engine behind PS §5 and every transaction posting.
2. **Business logic:** validate-then-post; balanced-only; Decimal money; source-tagged entries.
3. **Database impact:** no new tables; exercises NumberSequence + all ledger CHECKs/triggers.
4. **API impact:** none directly — an internal service. Future Invoice/Bill/Payment flows call
   it; **no route creates a POSTED entry itself.**
5. **Security:** `createdById` is stamped from the authenticated caller; the single path plus
   DB triggers mean no code (or accidental query) can post an unbalanced/forged entry.
6. **Validation:** pure `assertBalanced` (service) + DB CHECKs/triggers (backstop).
7. **Testing (17 total, all green):** unit — money (3), `assertBalanced` (5); integration on
   the real DB — posts balanced + allocates number, rejects unbalanced, **direct POSTED insert
   blocked**, **posted items immutable**, **concurrent posts get distinct numbers**.
8. **Performance:** one transaction; numbering is a single atomic statement; no N+1.
9. **Demo:** post an opening entry (Dr Bank / Cr Capital) → POSTED + balanced; try a direct
   POSTED insert → rejected; try to edit a posted item → rejected; fire two posts at once →
   distinct numbers.
10. **Known limitations:** `postEntry` posts pre-computed lines — it does not compute document
    totals/tax (callers do); cancellation/reversal is a later feature; single currency.
