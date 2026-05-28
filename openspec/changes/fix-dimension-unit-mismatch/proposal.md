# Proposal: Fix Dimension Weight Unit Inconsistency (bug)

> Status: **investigated 2026-05-28 — no active bug found.** Re-scoped to
> regression-test the invariant + a flagged admin-boundary validation follow-up.

## Audit conclusion (2026-05-28)

A full call-site audit found **no active 1000× mismatch**. Every real consumer of
gram-denominated pricing converts kg→g first:
- `utils/deliveryTypeHelpers.js` converts (`weight * 1000`) before calling
  `calculateDeliveryPrice` (the only caller of it).
- `lib/printPricing.js` converts (`weight * 1000`).
- `getApplicableDeliveryTypes` (the unguarded pass-through that motivated the
  original worry) has **zero callers** in the codebase.

So the risky unit-standardisation refactor is **not warranted** (it would only
shift live prices for no benefit). The invariant is now pinned by
`tests/unit/unitContract.test.js` (plus the existing per-module tests) so a future
refactor cannot silently reintroduce the error.

### Remaining actionable (FLAGGED — needs human input)

Admin API endpoints (`app/api/admin/custom-print-requests`,
`app/api/product/custom-print-config`) accept raw `dimensions` without
validation. Adding **non-negative/number validation is safe**, but **range
sanity thresholds** (e.g. "reject weight > 50 kg as a likely grams typo") are a
**product decision** — the client must confirm realistic max dimensions/weight
before we enforce them. Do not guess thresholds. See
`add-input-validation-admin-endpoints` backlog.

## Why

Weight units are inconsistent across the codebase, a latent source of pricing
bugs:

- `CustomPrintRequest.dimensions.weight` and `Product.dimensions.weight` are
  documented as **kg**.
- `utils/deliveryPriceCalculator.js#calculateDeliveryPrice` compares `weight`
  against tier `minWeight`/`maxWeight` which are defined in **grams**
  (`models/AppSettings.js` `PricingTierSchema`).
- `utils/deliveryTypeHelpers.js` *does* convert kg→g before calling
  `calculateDeliveryPrice` (`weight * 1000`), but
  `getApplicableDeliveryTypes`/`calculateDeliveryPrice` callers that pass raw
  model dimensions (kg) would silently mismatch by 1000×.
- `lib/printPricing.js` treats `dimensions.weight` as kg (`* 1000`).

A caller that forgets the conversion gets tier matches that are off by three
orders of magnitude (e.g. a 0.2 kg model compared as 0.2 g), producing wrong or
inapplicable delivery prices.

## What Changes

- Standardise on a single internal unit (recommend grams for weight, cm³ for
  volume) at the calculator boundary, OR make `calculateDeliveryPrice` accept an
  explicit unit and convert internally.
- Add unit-boundary tests asserting kg-in / gram-tier matching is correct.
- Audit every caller of `calculateDeliveryPrice` /
  `getApplicableDeliveryTypes` for the conversion.

## Impact

- **Specs:** modifies the (to-be-written) delivery-pricing capability.
- **Code:** `utils/deliveryPriceCalculator.js`, `utils/deliveryTypeHelpers.js`,
  `lib/printPricing.js`, and callers.
- **Risk:** changing units can shift live delivery prices — gate behind tests and
  verify against known orders before rollout.
