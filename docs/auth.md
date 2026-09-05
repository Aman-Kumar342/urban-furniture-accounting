# Auth &amp; RBAC — Module Notes

> Reviewer-defensible notes for the authentication + role-based access module.
> Code: `src/server/auth/*`, `src/server/services/auth.service.ts`,
> `src/server/repositories/user.repo.ts`, `src/server/validation/auth.ts`,
> `src/app/api/auth/*`, `src/app/api/admin/ping` (RBAC demo).

## 1. Requirement satisfied
PS Primary Actors + roles: **Admin / Accountant / Contact**; "a Contact can only view their
own invoices/bills." This module provides authentication and the server-side gate every
protected route reuses. (`problemstatement.md §3`, `expectation.md §7`.)

## 2. Business logic
- **Signup** creates an internal `ACCOUNTANT` (admins/portal users are provisioned via
  seed / contact creation, never public signup).
- **Login** verifies bcrypt hash; identical error for missing/inactive/bad-password
  (no account enumeration).
- **Sessions** are DB-backed: a 32-byte random token goes to the client in an httpOnly
  cookie; only its **SHA-256 hash** is stored, so a DB read never yields a usable token.
- **Logout** deletes the session row (server-side revocation).
- **RBAC**: `requireUser()` (401) and `requireRole(...roles)` (403) guard routes; a Contact
  is linked to a `contactId` for per-owner scoping of their documents (used by later modules).

## 3. Database impact
One additive table, `Session { id, userId→User (cascade), tokenHash (unique), userAgent,
ipAddress, expiresAt, createdAt }`, indexed on `userId` and `expiresAt`. No change to
accounting entities. Uses existing `User`/`Contact`.

## 4. API impact
`POST /api/auth/signup` (201), `POST /api/auth/login` (200), `POST /api/auth/logout` (200),
`GET /api/auth/me` (200/401), `GET /api/admin/ping` (RBAC demo: 200 admin / 403 other /
401 anon). All use the shared `{ error: { code, message } }` envelope and correct status codes.

## 5. Security implications
- Passwords: bcrypt (cost 10), never stored or logged in plaintext.
- Session cookie: `httpOnly`, `sameSite=Lax`, `secure` in production, `path=/`, 7-day expiry.
- Token stored hashed; expiry checked and auto-pruned on read; inactive users rejected.
- **Server-side enforcement**: the API is the gate; UI hiding is never the control.
- No account enumeration; JSON body + Zod validation on every input.

## 6. Validation rules
Zod: signup = name(1–120) + email + password(≥8); login = email + password. Invalid JSON →
400 `BAD_JSON`; invalid fields → 400 `VALIDATION` with `fieldErrors`.

## 7. Testing strategy
- **Unit** (`vitest`): password hash/verify, salting, no-plaintext (`password.test.ts`, 4 tests, green).
- **E2E** (verified via curl): anon `me`→401; wrong password→401; admin login→200, `me`→200,
  `admin/ping`→200; accountant `admin/ping`→**403**; logout→200 then `me`→**401**; signup→201.

## 8. Performance considerations
Session lookup is a single indexed query on `tokenHash` (unique). No N+1. Expired sessions
pruned lazily on read; a periodic cleanup of `expiresAt < now()` can be added later.

## 9. Demo / reviewer explanation
Log in as `accountant@…`, hit `/api/admin/ping` → **403**; log in as `admin@…` → **200**.
Log out → `/api/auth/me` → **401**. Show the `Session` row's `tokenHash` (a hash, not the
cookie value). That demonstrates real server-side RBAC + revocable, hash-only sessions.

## 10. Known limitations
- No CSRF token yet (SameSite=Lax mitigates; add a token before exposing state-changing
  forms cross-site). No rate limiting on login (add for production). No password reset /
  email verification (out of hackathon scope). Self-signup is ACCOUNTANT-only by design.

**Seed users (dev):** `admin@urbanfurniture.test` / `Admin@123` (ADMIN),
`accountant@urbanfurniture.test` / `Account@123` (ACCOUNTANT),
`nimesh@urbanfurniture.test` / `Portal@123` (CONTACT, linked to contact "Nimesh Pathak").
