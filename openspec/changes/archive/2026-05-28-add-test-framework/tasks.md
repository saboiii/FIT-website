# Tasks: Add Automated Test Framework

## 1. Harness
- [x] 1.1 Install Vitest + RTL toolchain (vitest, jsdom, @testing-library/react,
      @testing-library/jest-dom, @testing-library/user-event, @vitejs/plugin-react)
- [x] 1.2 Add `vitest.config.mjs` with `@/*` alias + jsdom env + setup file
- [x] 1.3 Add `tests/setup.js` (jest-dom matchers)
- [x] 1.4 Add `test`, `test:run`, `test:coverage` scripts to `package.json`

## 2. Unit suite over existing pure logic
- [x] 2.1 `lib/printPricing.js` — formula, infill, multipliers, markup, null formula
- [x] 2.2 `utils/discount.js` — date window, minimum amount, tiers, stacking, cap
- [x] 2.3 `utils/deliveryPriceCalculator.js` — tier match, applicability, aggregation
- [x] 2.4 `utils/deliveryTypeHelpers.js` — formula vs tier pricing, digital exclusivity
- [x] 2.5 `utils/validate.js` — sanitize, URL, magic numbers
- [x] 2.6 `app/api/product/slugify.js` — slug normalization

## 3. Integration suite
- [x] 3.1 `calculateCartItemBreakdown` — variants + discount + delivery composed

## 4. Verify
- [x] 4.1 `yarn test:run` green
- [x] 4.2 coverage thresholds + CI gating — **moved to `add-test-coverage-ci`**

> Archived 2026-05-28. `testing` capability folded into `openspec/specs/testing/`.
