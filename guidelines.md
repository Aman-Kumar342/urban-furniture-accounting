# Development Guidelines

> The project's rulebook. Every implementation decision from here on must comply.
> When in doubt, this file wins. Companion to `problemstatement.md` (what) and
> `expectation.md` (why it scores). Labels: `[OFFICIAL REQUIREMENT]`,
> `[ENGINEERING DECISION]`, `[RECOMMENDED ENHANCEMENT]`, `[OPTIONAL]`.

---

## 1. Core Principle
**Build a smaller system that is correct, coherent, dynamic and demonstrable rather
than a huge system that is incomplete.** Depth over breadth. The accounting engine and
the database are the heart of the project; everything else serves them.

## 2. Problem Statement Traceability
Every feature must trace to (a) an official PS requirement, (b) a real business need,
or (c) a judging criterion. Before building anything, name the trace. No feature is
added because it "sounds impressive." If it is our idea, label it
`[ENGINEERING DECISION]`/`[RECOMMENDED ENHANCEMENT]` and add it to
`problemstatement.md` first.

## 3. Database-First Development
Database design precedes major feature code. Before implementing a feature, confirm:
entities, relationships, cardinality, constraints, indexes, transaction boundaries, and
the ERD are settled for the tables it touches. We change the schema deliberately (a
migration), never by accident. Data flow direction: **DATABASE → DOMAIN MODEL →
BUSINESS LOGIC → API → UI**, never UI-first.

## 4. Accounting Integrity
Never allow an invalid accounting state. At minimum enforce, in the service layer and
(where possible) the DB:
- Debits = credits on every posted entry (INV-1).
- A journal item has exactly one non-zero side, both ≥ 0 (INV-2).
- Payments affect the correct outstanding balance; status derived (INV-5).
- Reports derive from actual persisted journal items (never hardcoded).
- Historical records stay consistent; posted entries are immutable (INV-6).
- Related postings run inside one DB transaction (INV-7).
- Invalid states are rejected server-side (INV-8).

## 5. No Fake Logic
Never use hardcoded report numbers, fake dashboard statistics, fake accounting
calculations, fake AI, static JSON as final data, or mocked results in the judging
flow. If we demo a feature, it actually works against the database. `[OFFICIAL
REQUIREMENT]` reinforces this: real-time/dynamic data only.

## 6. Dynamic Data
Production data flow is always:
`React UI → API → Service → Repository → Prisma → PostgreSQL → API → UI`.
Static fixtures are allowed only as disposable dev scaffolding and must be gone from
the demo path.

## 7. Next.js Architecture
Maintain strict separation of concerns:
```
UI (components/pages)
  → Route Handler (/app/api/*)        thin: auth + parse + delegate + respond
    → Service / Domain                business rules, accounting, orchestration
      → Repository                    data-access functions (own the Prisma calls)
        → Prisma → PostgreSQL
```
- Business logic does **not** live in UI components.
- Complex business logic does **not** live in route handlers.
- Complex/scattered queries do **not** live in components; they live in repositories.
- Accounting rules live in dedicated domain/service modules reused by all flows.

`[ENGINEERING DECISION]` Suggested source layout (next phase, not built yet):
```
src/
  app/            routes + pages (App Router)
    api/          route handlers
  server/
    services/     domain logic (accounting, invoicing, payments, reports)
    repositories/ data access
    validation/   Zod schemas (shared with client)
    auth/         session + RBAC helpers
  lib/            prisma client, money, formatting
  components/     UI building blocks (design system)
prisma/           schema.prisma, migrations, seed
docs/             ERD, design notes
```

## 8. API Guidelines
- Predictable REST-style routes (`/api/<resource>`, `/api/<resource>/:id/<action>`).
- Correct HTTP status codes (200/201/400/401/403/404/409/422/500).
- Validate every input with Zod at the boundary.
- Authorize (role + ownership) before doing work.
- One consistent error envelope: `{ error: { code, message, details? } }`.
- Lists return pagination metadata; responses have a stable shape.

## 9. Validation
Three layers, in order of trust:
1. **Client-side** — for UX (instant feedback). Never the security boundary.
2. **Server-side (Zod)** — the real gate; every request body/param validated.
3. **Database** — constraints (CHECK/UNIQUE/NOT NULL/FK/enum) as the last line.
Never trust client validation alone.

## 10. Security
Never: commit secrets; trust frontend permissions; expose a Contact's data to another
Contact; allow unauthorized accounting operations; bypass server-side authorization.
Always: hash passwords; enforce RBAC on the server; scope Contact queries by
`contact_id`; keep secrets in `.env` (+ `.env.example`); use Prisma parameterized
queries.

## 11. UI Guidelines
The UI should feel like a serious ERP/business app. Prioritize clarity, consistency,
visual hierarchy, responsive layout, readable tables, useful filters, meaningful status
badges, good forms, and useful error messages. Avoid excessive animation, unnecessary
visual effects, inconsistent components, needless pages, and complexity that does not
improve usability. One color palette, one component set, consistent typography and
spacing. Every screen handles loading, empty, and error states.

## 12. Performance
Avoid N+1 queries, unnecessary requests, loading huge datasets, and duplicate
calculations. Use indexes, pagination, efficient SQL aggregation for reports, and
caching only where clearly justified. Reports aggregate in the database, not in JS.

## 13. Git
Every team member makes meaningful, attributed contributions. Avoid one giant final
commit, fake/padding commits, and one person owning the whole repo. Work on feature
branches, open PRs, review before merging to `main`. Small commits, one logical change
each, descriptive messages, no secrets. `[ENGINEERING DECISION]` No AI/co-author
attribution on commits — commits are authored by team members only.

## 14. 24-Hour Priority System
`P0` = must work for judging · `P1` = strong scoring feature · `P2` = polish ·
`P3` = optional/wow. If time gets tight: **cut P3 first → reduce P2 → protect P1 →
never compromise P0.** Re-check the clock against this ladder every few hours.

## 15. Definition of Done
A feature is **not** done because the UI exists. It is done when the relevant parts of:
UI + client validation + API + business logic + database persistence + authorization +
error handling + tests + integration are working together against PostgreSQL — and a
teammate can explain it to a judge.

## 16. Code Review (checklist before "complete")
- Is the business logic correct (especially accounting)?
- Is the database model correct for this feature?
- Is it traceable to the PS / a labeled decision?
- Is server-side validation present?
- Is authorization (role + ownership) present?
- Is error handling present and consistent?
- Is data actually persisted (no fakes)?
- Is it dynamic (reads/writes the DB)?
- Is it performant (indexes, no N+1, paginated)?
- Can the owner explain it to a judge?
- Does it measurably improve our score? If not, why are we building it?
