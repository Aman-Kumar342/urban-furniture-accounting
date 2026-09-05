# Required Engineering Skills

> A practical capability checklist for the team. Each skill is classified:
> **[MUST MASTER]** (P0 depends on it), **[SHOULD KNOW]** (needed for a strong
> submission), **[NICE TO HAVE]** (polish/wow). Skills marked ⭐ are the ones most
> likely to be probed **during judging** — make sure at least one person can explain
> each on the spot.

---

## 1. Accounting Domain
| Skill | Level | Notes |
|---|---|---|
| Double-entry bookkeeping ⭐ | **MUST MASTER** | The core mental model; every posting has equal Dr/Cr. |
| Debit / credit & normal balances ⭐ | **MUST MASTER** | Assets/Expenses = Dr; Liabilities/Income/Capital = Cr. |
| Chart of Accounts & account types ⭐ | **MUST MASTER** | Asset, Liability, Income, Expense, Capital. |
| Journals, journal entries, journal items | **MUST MASTER** | The ledger structure we persist. |
| Receivables (AR) & payables (AP) ⭐ | **MUST MASTER** | Drive invoice/bill and payment logic. |
| Invoices, bills, payments & allocation | **MUST MASTER** | The two demo flows. |
| Balance Sheet & why it balances ⭐ | **MUST MASTER** | Assets = Liabilities + Capital; net profit ties in. |
| Profit & Loss | **MUST MASTER** | Income − Expenses = net profit. |
| Tax (output/input) | **SHOULD KNOW** | Simple percentage; output=liability, input=asset. |
| Analytic accounts & budgets | **SHOULD KNOW** | Planned vs actual (P1). |
| Account hierarchy | **NICE TO HAVE** | parent_id grouping for reports. |

## 2. Database
| Skill | Level | Notes |
|---|---|---|
| Relational modeling & ERD ⭐ | **MUST MASTER** | Highest-weighted criterion. |
| Normalization (to ~3NF, pragmatic) ⭐ | **MUST MASTER** | Justify every deliberate exception. |
| Foreign keys & cardinality | **MUST MASTER** | 1–N and N–N (payment allocations). |
| Constraints (CHECK/UNIQUE/NOT NULL/enum) ⭐ | **MUST MASTER** | Enforce invariants at the DB. |
| DB transactions ⭐ | **MUST MASTER** | Atomic multi-row postings. |
| Monetary data modeling | **MUST MASTER** | `NUMERIC(14,2)`, never float. |
| Indexes & why | **SHOULD KNOW** | FKs + report/filter columns. |
| Aggregation queries (GROUP BY/SUM) ⭐ | **SHOULD KNOW** | Reports and balances. |
| Query optimization / avoiding N+1 | **SHOULD KNOW** | Performance criterion. |
| PostgreSQL operations (local) | **SHOULD KNOW** | Create DB, run migrations, inspect data. |

## 3. Next.js / Frontend
| Skill | Level | Notes |
|---|---|---|
| Next.js App Router ⭐ | **MUST MASTER** | Pages + route handlers in one app. |
| React (server & client components) | **MUST MASTER** | The UI. |
| TypeScript | **MUST MASTER** | Types across the whole stack. |
| Tailwind CSS | **MUST MASTER** | Consistent design system. |
| Forms + client validation | **MUST MASTER** | UX; mirror Zod schemas. |
| Tables, filters, pagination | **SHOULD KNOW** | List views. |
| Dashboard / data display | **SHOULD KNOW** | KPI cards, simple charts. |
| API integration & fetching | **SHOULD KNOW** | Loading/error/empty states. |
| State management (local/URL) | **SHOULD KNOW** | Keep it simple; avoid heavy libs. |

## 4. Backend / Domain
| Skill | Level | Notes |
|---|---|---|
| Next.js Route Handlers ⭐ | **MUST MASTER** | Thin API layer. |
| Service / domain layer design ⭐ | **MUST MASTER** | Where accounting rules live. |
| Repository / data-access layer | **MUST MASTER** | Isolate Prisma queries. |
| Prisma (schema, migrate, client) ⭐ | **MUST MASTER** | ORM + migrations. |
| Zod validation ⭐ | **MUST MASTER** | Server-side input safety. |
| Error handling (consistent envelope) | **MUST MASTER** | Correct status codes. |
| Transaction orchestration | **MUST MASTER** | `prisma.$transaction` in services. |
| REST API design | **SHOULD KNOW** | Predictable routes + codes. |

## 5. Security
| Skill | Level | Notes |
|---|---|---|
| Authentication (hashed passwords, sessions/JWT) ⭐ | **MUST MASTER** | No plaintext passwords. |
| RBAC & server-side authorization ⭐ | **MUST MASTER** | Three roles; enforce on API. |
| Ownership scoping (Contact) ⭐ | **MUST MASTER** | Can't read others' data. |
| Input validation & sanitization | **MUST MASTER** | Zod + Prisma parameterization. |
| Secrets management | **MUST MASTER** | `.env`, `.env.example`, nothing in Git. |
| Secure API design | **SHOULD KNOW** | Least privilege per endpoint. |

## 6. Testing
| Skill | Level | Notes |
|---|---|---|
| Business-rule tests (accounting) ⭐ | **SHOULD KNOW** | Balanced entries, report math. |
| API / integration tests | **SHOULD KNOW** | End-to-end flows. |
| Validation & permission tests | **SHOULD KNOW** | Negative cases. |
| Unit tests (services) | **SHOULD KNOW** | Posting, allocation, tax. |
| Edge-case thinking | **SHOULD KNOW** | Partial payments, zero tax, archived refs. |
| Database testing / seed fixtures | **NICE TO HAVE** | Reproducible demo state. |

## 7. Git
| Skill | Level | Notes |
|---|---|---|
| Branches & meaningful commits ⭐ | **MUST MASTER** | Every member contributes; no giant final commit. |
| Pull requests & review | **SHOULD KNOW** | Merge to `main` via PR. |
| Conflict resolution | **SHOULD KNOW** | Expect it with parallel work. |
| Clean history / commit hygiene | **SHOULD KNOW** | One logical change per commit; no secrets. |

## 8. Hackathon Craft
| Skill | Level | Notes |
|---|---|---|
| Prioritization (P0→P3) ⭐ | **MUST MASTER** | Protect P0; cut P3 first. |
| Timeboxing | **MUST MASTER** | Stop at "good enough"; move on. |
| Debugging under pressure ⭐ | **MUST MASTER** | Read logs; isolate fast. |
| Demo preparation ⭐ | **MUST MASTER** | Rehearse the narrative; seed clean data. |
| Technical explanation ⭐ | **MUST MASTER** | Everyone can defend their module. |
| Scope control | **MUST MASTER** | Say no to shiny extras. |

---

## Skills Most Important During Judging (the ⭐ shortlist)

Because **Database Design is the top criterion** and accounting correctness is our
differentiator, the highest-leverage skills to have airtight are:

1. **Explain the data model / ERD** — single-ledger design, FKs, constraints, indexes.
2. **Explain double-entry** — why every entry balances and why the Balance Sheet balances.
3. **Show real dynamic data** — post a transaction, watch reports change.
4. **Defend security** — RBAC + Contact ownership scoping, server-side.
5. **Defend integrity** — DB transactions make postings atomic.

> **Ownership rule:** each teammate must be able to explain *their own module* plus the
> five points above. If nobody can explain a feature to a judge, it does not help our
> score — cut it or learn it.
