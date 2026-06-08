# Tasks: Verify Quote + Checkout Flows

## 1. Tests first
- [x] 1.1 Unit-test `customPrintDisplayPrice`: instant uses `quote.total`;
      manual/legacy uses `basePrice + printFee`; missing fields → 0.

## 2. Pure helper + wire-up
- [x] 2.1 Add `lib/customPrintDisplayPrice.js`.
- [x] 2.2 `app/cart/Cart.jsx` uses the helper for the quoted-price row.
- [x] 2.3 Admin "set quote" PUT sets `doc.quoteMode = 'manual'`.

## 3. Verify
- [x] 3.1 `yarn test:run` green.
- [ ] 3.2 Stripe checkout completion + `paid` webhook (deferred to client QA —
      `verify-quoting-flows-browser` with `scripts/dev-tunnel.sh`).
