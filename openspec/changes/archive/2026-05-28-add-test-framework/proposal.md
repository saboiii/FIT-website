# Proposal: Add Automated Test Framework

## Why

The repository ships substantial business logic — print pricing, stacked/tiered
discounts, delivery-tier pricing, cart breakdown, validation, slugging — with
**no test runner configured** (only static JSON fixtures under `tests/`). Before
growing the instant-quoting-engine (GOOS demands tests drive the design), we need
a fast, reliable harness and a baseline suite over the existing pure logic so
regressions are caught and behaviour is documented as executable specification.

## What Changes

- Add **Vitest** as the unit/integration runner and **React Testing Library**
  for component tests, with config (`vitest.config.mjs`) mirroring the `@/*`
  path alias and a jsdom environment + `@testing-library/jest-dom` setup.
- Add `test`, `test:run`, and `test:coverage` scripts to `package.json`.
- Write a baseline suite over existing dependency-free logic:
  - `lib/printPricing.js` — `calculatePrintCost`
  - `utils/discount.js` — `getEffectivePercentageForRule`, `getDiscountedPrice`
  - `utils/deliveryPriceCalculator.js` — tier matching + applicability
  - `utils/deliveryTypeHelpers.js` — formula/tier applicability + selection helpers
  - `utils/validate.js` — `sanitizeString`, `isValidUrl`, `checkMagicNumber`
  - `app/api/product/slugify.js` — `slugify`
  - `app/api/checkout/calculateBreakdown.js` — `calculateCartItemBreakdown`
    (integration: variants + discount + delivery composed together)
- Establish testing conventions in `project.md` (test-first, mock at boundaries).

## Impact

- **Specs:** adds `testing`.
- **Code:** adds dev dependencies (vitest, jsdom, @testing-library/*,
  @vitejs/plugin-react), `vitest.config.mjs`, `tests/setup.js`, and
  `tests/**/*.test.js`. No production code changes.
- **Out of scope:** component/RTL tests for the editor and API-route tests with
  full Clerk/Stripe/Mongoose mocks land alongside the features that need them
  (the harness is configured for them here). Coverage thresholds/CI gating are a
  follow-up.
