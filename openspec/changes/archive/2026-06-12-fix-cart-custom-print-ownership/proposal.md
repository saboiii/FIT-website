# Proposal: Enforce Ownership When Adding a Custom Print to the Cart (security)

> Status: **COMPLETE 2026-06-12** (archived). Found during a full-codebase security scan.

## Why

`POST /api/cart/custom-print` looks up the request by `requestId` only — no
ownership check — so any authenticated user who learns another user's requestId
(UUID; unguessable but shareable/leakable) can add that request to their own
cart and pay for it, marking the victim's request `paid` via the Stripe webhook.
Every other custom-print route scopes by `userId` (e.g. `custom-print/delete`
returns 403 on a foreign request; `/api/quote` persist checks
`reqDoc.userId !== userId`). This route is the inconsistency.

Two adjacent paper cuts in the same handler:

- The cart line's `price` snapshot uses `basePrice + printFee`, which is stale
  for instant quotes (display/charge now use `quote.total` — see
  `fix-instant-quote-checkout-charge`).
- The 500 handler returns `details: error.errors || error` — internal error
  objects (stack-adjacent data, schema paths) leak to the client.

## What Changes

- Scope the lookup: `CustomPrintRequest.findOne({ requestId, userId })` →
  foreign/unknown requests get the same 404 (no existence oracle).
- Snapshot the cart line price via the shared `customPrintDisplayPrice`
  selector.
- Return only a safe error message from the catch block (keep full server-side
  logging).
- Route-level integration test (mocking auth/db/models at the boundary, per the
  repo's testing convention).

## Impact

- **Specs:** `custom-print-requests` — adds an ownership requirement for cart
  addition.
- **Code:** `app/api/cart/custom-print/route.js`;
  `tests/integration/cartCustomPrint.test.js`.
- **Risk:** low — legitimate users only ever add their own requests (the UI
  passes the signed-in user's own requestId).
