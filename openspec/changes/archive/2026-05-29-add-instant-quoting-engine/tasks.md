# Tasks: Instant Quoting Engine

> GOOS / outside-in, test-first. Each `#### Scenario:` maps to a test.
> Progress log: 2026-05-28 — pure engine + API + editor preview implemented
> (100 tests green). Remaining items are flagged below.

## 1. Geometry metrics (`lib/quoting/geometryVolume.js`)
- [x] 1.1 Unit tests: cube volume, scaled cube, bbox dims, empty → 0
- [x] 1.2 Signed-tetrahedron volume over indexed + non-indexed geometry
- [x] 1.3 Unit conversion (mm/m/cm → cm) + world-transform baking (adapter)
- [x] 1.4 Watertight (edge-parity) check; non-watertight → bbox fallback + `low` confidence
- [x] 1.5 `lib/quoting/threeGeometryAdapter.js` extracts world-space positions from a scene

## 2. Material estimate (`lib/quoting/materialEstimate.js`)
- [x] 2.1 Unit tests: weight ↑ with volume/infill/density; ≤ solid; 100% infill = solid
- [x] 2.2 Weight estimation; per-material densities in `pricingDefaults.js`

## 3. Print-time estimate (`lib/quoting/printTimeEstimate.js`)
- [x] 3.1 Unit tests: ↑ volume, ↓ thicker layers, ↑ walls/support; hours > 0
- [x] 3.2 Heuristic behind `estimatePrintHours()` interface (slicer-swappable)

## 4. Quote composition (`lib/quoting/quote.js`)
- [x] 4.1 Tests for all seven factors
- [x] 4.2 Tests for expedite (percent/flat/greater) and minimum price
- [x] 4.3 Tests for breakdown shape, subtotal/total, confidence propagation
- [x] 4.4 `calculateInstantQuote`; reuses `deliveryPriceCalculator` for delivery

## 5. Pricing config (`models/AppSettings.js`)
- [x] 5.1 `quotingConfig` fields (rates, fees, expedite, minimum, densities)
- [x] 5.2 Defaults applied; migration-safe (legacy `printPricingFormula` retained)
- [x] 5.3 Admin settings UI to edit the new fields — `QuotingPricingManagement`
      + `GET/PUT /api/admin/quoting` (admin-gated, zod-validated)

## 6. Quote API (`app/api/quote/route.js`)
- [x] 6.1 `buildQuote` tests: valid payload → itemized quote (server pricing)
- [x] 6.2 Tests: unknown/price/rate fields rejected (`.strict`); bounds enforced
- [x] 6.3 Route: zod validation, Content-Length guard, Clerk optional-auth, AppSettings pricing,
      persist+auto-quote when `requestId` + owner
- [ ] 6.4 Route-level integration test with mocked Clerk/Mongoose — **TODO (deferred):
      heavier infra mocks; logic is covered by `buildQuote` tests**

## 7. Editor quote panel (`components/Editor/QuotePanel.jsx`)
- [x] 7.1 Store captures `geometryMetrics` after model load
- [x] 7.2 RTL test: null-model renders nothing, low-confidence warning, fetched total,
      no client price in body
- [x] 7.3 Debounced recompute on settings/options change; design-system styling
- [x] 7.4 Posts to `/api/quote` (server-authoritative); options + expedite toggles

## 8. Persist quote onto request (`models/CustomPrintRequest.js`)
- [x] 8.1 `quote` sub-doc + `quotedAt`; route persists + sets status `quoted`
- [ ] 8.2 **DEFERRED to Phase 2** (`add-generic-print-presets` /
      `improve-custom-print-post-config-ux`): trigger persistence from the editor
      *submit* with the user's chosen options/expedite (needs the option state
      lifted into the submit form + the pay-first routing). The API + model
      support it today; only the editor-submit trigger is deferred. Admin override
      path unchanged.

## 9. Wire-up & regression
- [x] 9.1 `yarn test:run` green (100 tests)
- [ ] 9.2 **BLOCKED — needs browser/human:** manual `/editor` check (upload a real
      STL → live quote updates → totals sane). Could not run the interactive
      Three.js editor headlessly. See verification note in proposal.
- [ ] 9.3 Verify cart/checkout uses the persisted quote total (lands with 8.2)

## 10. Spec fold-down
- [ ] 10.1 Update `openspec/specs/*` from deltas; archive this change (after 5.3/8.2/9.2)

## Flagged follow-ups (backlog created)
- `add-quote-api-rate-limiting` — needs Upstash Redis infra
- `add-server-side-geometry-verification` — recompute volume from stored model to
  prevent metric tampering before payment
