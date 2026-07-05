# Proposal: Verify Quote + Checkout Flows (e2e where testable)

> Status: active. From client manual-testing feedback (#15, #20).

## Why

After the instant/manual split (`add-instant-vs-manual-quote-flow`) the
end-to-end claim is: an instant quote is immediately payable with the engine
total; a manual quote becomes payable after admin sets `printFee`. Two gaps
remain to harden that claim without requiring browser/Stripe e2e:

- The cart's quote-display logic is inline in `Cart.jsx` — easy to drift from
  the spec. Extracting it to a pure helper makes the price selection rule
  testable and reusable.
- The admin "set quote" endpoint doesn't explicitly set `quoteMode = 'manual'`,
  so an admin-issued quote leaves the field as whatever the config-save wrote
  (or `null` for legacy requests). Defensively set it so the cart's branch
  decision is always correct.

The full Stripe checkout completion path (Stripe Checkout, webhook → `paid`
status) needs a real Stripe sandbox + tunnel; that stays in the browser QA
checklist (`verify-quoting-flows-browser`).

## What Changes

- New pure helper `lib/customPrintDisplayPrice.js` exporting
  `customPrintDisplayPrice(request)` → `{ amount, label, source }`. Returns
  `quote.total` (label "Instant Quote", source "instant") when the request has
  `quoteMode === 'instant'` and a finite `quote.total`; otherwise the legacy
  `basePrice + printFee` (label "Quoted", source "manual"). Unit-tested.
- `app/cart/Cart.jsx` uses the helper.
- `app/api/admin/custom-print-requests` PUT (action='quote') sets
  `doc.quoteMode = 'manual'` explicitly.

## Impact

- **Specs:** `custom-print-requests` (cart price selection rule).
- **Code:** new `lib/customPrintDisplayPrice.js`; small edits to `Cart.jsx` and
  the admin route.
- **Tests:** new `tests/unit/customPrintDisplayPrice.test.js`.
- **Risks:** low — pure refactor of an inline IIFE plus one defensive line.
- **Out of scope:** Stripe checkout completion (browser QA).
