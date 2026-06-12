# Proposal: Charge Instant Quotes Their Quoted Total at Checkout (bug)

> Status: **COMPLETE 2026-06-12.** Found during a full-codebase integration
> scan. Also applied to the Stripe webhook's order-record block (same duplicated
> base+fee derivation), so the paid `totalAmount` matches the charged amount.

## Why

The established spec (`custom-print-requests` → "Persisted quote breakdown",
"Quoted price is fixed at checkout") requires the price shown to the customer to
match the price charged. It doesn't:

- The cart **displays** `customPrintDisplayPrice(request)` — for
  `quoteMode === 'instant'` that is `quote.total` (the Instant Quoting Engine
  result).
- Both checkout routes (`app/api/checkout/breakdown` and
  `app/api/checkout/session`) **charge** `basePrice + printFee` — fields only the
  admin manual-quote path sets. The instant persist path (`POST /api/quote`)
  sets `quote`/`quoteMode` but never `printFee`, so an instant-quoted request
  reaches Stripe priced at the generic product base price (typically far below
  the quoted total, potentially 0).
- The Stripe webhook's `totalAmount` flows from the session's
  `customPrintQuotedPrice`, so fixing the session route fixes the paid record.

The same ~30-line custom-print pricing block is duplicated verbatim in both
checkout routes (drift risk — this bug is that drift).

## What Changes

- Extend the pure module `lib/customPrintDisplayPrice.js` with
  `customPrintChargeBreakdown(request, requestedDeliveryType)` — selects the
  charge amount via the existing `customPrintDisplayPrice` (instant →
  `quote.total`, manual/legacy → `basePrice + printFee`) and resolves the
  delivery type/fee (requested if available, else first; `customPrice` over
  `price`). Unit-tested.
- Replace the duplicated blocks in `checkout/breakdown` and `checkout/session`
  with the helper.

## Impact

- **Specs:** none (the existing requirements already specify this behaviour;
  the code was wrong).
- **Code:** `lib/customPrintDisplayPrice.js`, the two checkout routes, unit
  tests.
- **Risk:** low — manual-quote behaviour is unchanged (same `base + fee`);
  instant quotes change from undercharging to the displayed total, which is the
  specified behaviour.
