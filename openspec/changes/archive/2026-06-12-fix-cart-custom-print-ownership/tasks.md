# Tasks: Enforce Ownership When Adding a Custom Print to the Cart

- [x] 1.1 Failing route-level test (`tests/integration/cartCustomPrint.test.js`)
      mocking authenticate/db/User/CustomPrintRequest: foreign requestId → 404 +
      cart unchanged; own requestId → added with display price (instant
      `quote.total`); unauthenticated → 401.
- [x] 1.2 Scope the lookup to `{ requestId, userId }`; snapshot price via
      `customPrintDisplayPrice`; stop returning internal `details` on 500.
- [x] 1.3 `yarn test:run` green; lint changed files.
