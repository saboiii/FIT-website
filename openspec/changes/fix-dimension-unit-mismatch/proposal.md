# Proposal: Fix Dimension Weight Unit Inconsistency (bug)

> Status: backlog (bug). Discovered while mapping the pricing/delivery code.

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
