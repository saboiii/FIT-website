# Proposal: Add Instant Quoting Engine

## Why

Today, custom-print pricing is **admin-driven**: a customer uploads a model,
configures it, and submits — then waits for an admin to manually compute and set
a price (`basePrice + printFee`) before the request reaches `quoted`. There is
no price visible to the customer at configuration time, and the existing
`calculatePrintCost` helper (`lib/printPricing.js`) only models material weight +
a couple of multipliers + markup. It does **not** estimate print time, does not
derive volume/weight from the actual uploaded geometry, and does not express the
fee structure the business actually charges.

Reference quoting tools (e.g. quote.additiveinn.com) give the customer an
**instant price the moment they finish configuring**, which increases conversion
and removes manual quoting work. Our app already has the hard part — an in-browser
Three.js editor with full print settings — so we can compute a quote client-side
from the loaded mesh and the chosen settings.

Per the client, a quote is built from these factors:

1. Material weight (from model volume × infill × material density)
2. Print time (estimated)
3. Base fee
4. Post-processing fee
5. Special-request fee (e.g. model repair/edit)
6. Priority fee
7. Delivery fee

Plus an **expedited/rush** option that adds a configurable surcharge
(e.g. +50% or +$20) on top of the total.

## What Changes

- **New pure quoting module** `lib/quoting/` with:
  - `geometryVolume.js` — compute solid mesh volume (cm³) and bounding-box
    dimensions from a `THREE.BufferGeometry` (signed-tetrahedron method).
  - `materialEstimate.js` — volume + infill + material density → filament weight
    (g); per-material densities (PLA/PETG/ABS/resin/etc.).
  - `printTimeEstimate.js` — heuristic print-time (hours) from volume, layer
    height, infill, walls, support, nozzle (interface designed so a slicer-based
    estimator can replace it later — see backlog `add-slicer-accurate-estimation`).
  - `quote.js` — `calculateInstantQuote({ geometry, settings, pricing, options })`
    composing all seven factors + expedite into an itemized breakdown.
- **New quote configuration** on `AppSettings` (extends `printPricingFormula`):
  per-material density + rate, `printTimeRatePerHour`, `postProcessingFee`,
  `specialRequestFee`, `priorityFee`, `expediteSurchargePercent` /
  `expediteSurchargeFlat`, `minimumPrice`. Delivery fee continues to come from
  existing delivery-type pricing (`utils/deliveryPriceCalculator.js`).
- **New API** `GET/POST /api/quote` returning an itemized quote for given
  geometry metrics + settings, reading pricing config from `AppSettings`. (The
  authoritative server-side recompute prevents client price tampering.)
- **Editor UI**: an "Instant Quote" panel in the editor (`components/Editor/`)
  showing the live itemized breakdown (weight, time, each fee, expedite toggle,
  delivery estimate) styled to the existing design system, updating as settings
  change.
- **Persist the quote** onto `CustomPrintRequest` (new `quote` sub-document and
  `quotedAt`), so a configured request can reach `quoted` automatically with the
  customer-visible price, while admins retain an override.

## Impact

- **Specs:** adds `instant-quoting-engine`; modifies `custom-print-requests`
  (auto-quote replaces mandatory admin quote, with admin override retained) and
  `3d-model-editor` (adds the quote panel + geometry metrics).
- **Code:** new `lib/quoting/*`, new `app/api/quote/route.js`, editor component +
  store fields, `AppSettings` schema additions, admin settings UI for the new
  pricing fields. `lib/printPricing.js` is superseded by `lib/quoting/quote.js`
  but kept until admin tooling migrates.
- **Data:** new optional fields on `AppSettings` and `CustomPrintRequest`;
  backward compatible (defaults applied).
- **Out of scope (tracked as separate changes):** slicer-grade time/filament
  accuracy via cura-wasm (`add-slicer-accurate-estimation`); OTP contact
  verification at checkout (`add-otp-contact-verification`); shareable/saved
  quotes (`add-quote-persistence-and-sharing`).
- **Risk:** geometry volume is only meaningful for watertight (manifold) meshes;
  non-manifold models yield approximate volume. The estimator MUST flag low
  confidence and fall back to bounding-box estimation. Print-time heuristic is
  approximate by design — the breakdown labels it an estimate.
