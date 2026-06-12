# Tasks: Charge Instant Quotes Their Quoted Total at Checkout

- [x] 1.1 Failing unit tests for `customPrintChargeBreakdown` (instant uses
      `quote.total`; manual/legacy uses `basePrice + printFee`; delivery type
      resolution: requested-if-available else first, `customPrice` over `price`,
      empty list → no fee; currency defaults to sgd).
- [x] 1.2 Implement `customPrintChargeBreakdown` in
      `lib/customPrintDisplayPrice.js` (pure, reuses `customPrintDisplayPrice`).
- [x] 1.3 Wire into `app/api/checkout/breakdown/route.js` and
      `app/api/checkout/session/route.js`, replacing the duplicated block.
- [x] 1.4 `yarn test:run` green; lint changed files.
