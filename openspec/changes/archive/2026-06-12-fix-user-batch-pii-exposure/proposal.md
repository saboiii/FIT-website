# Proposal: Admin-Gate the Batch User Lookup (PII exposure)

> Status: **COMPLETE 2026-06-12** (archived). Found during a full-codebase security scan.

## Why

`GET /api/user/batch?ids=user_a,user_b,...` had **no authentication at all** and
returned, per user: full name, email, phone, formatted home address, role, and
Stripe account id. Clerk user IDs are not secret — the public
`/api/creators/search` returns them for every creator — so anyone could harvest
PII and Stripe account ids for up to 50 users per request, unauthenticated.

Its only caller is the admin dashboard's `CreatorPayments` component.

## What Changes

- Require Clerk auth (401) and `checkAdminPrivileges` (403) on
  `GET /api/user/batch`, matching every other admin-consumed endpoint.
- Route-level test (boundary mocks): unauthenticated → 401, non-admin → 403,
  admin → 200.

## Impact

- **Specs:** none (admin tooling; no customer-facing behavioural requirement).
- **Code:** `app/api/user/batch/route.js`, `tests/integration/userBatch.test.js`.
- **Risk:** none for legitimate use — the only caller runs in an admin session.
