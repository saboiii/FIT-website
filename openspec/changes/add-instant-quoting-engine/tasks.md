# Tasks: Instant Quoting Engine

> GOOS / outside-in, test-first. Start each phase with a failing test that
> expresses the behaviour, then implement until green. Each `#### Scenario:` in
> the spec deltas should map to at least one test.

## 0. Walking skeleton (thinnest end-to-end slice)
- [ ] 0.1 Failing acceptance test: given a known cube geometry + default pricing,
      the quote total is a specific expected number (material + base only)
- [ ] 0.2 Stub `calculateInstantQuote` returning baseFee only; make 0.1 progress
- [ ] 0.3 Wire a placeholder quote value into the editor so a number renders

## 1. Geometry metrics (`lib/quoting/geometryVolume.js`)
- [ ] 1.1 Unit tests: unit cube volume = 1 (in declared units), scaled cube,
      bounding box dims, degenerate/empty geometry → 0
- [ ] 1.2 Implement signed-tetrahedron volume over indexed + non-indexed geometry
- [ ] 1.3 Unit conversion (mm/m → cm) honouring source format + scene scale
- [ ] 1.4 Manifold/closed-mesh heuristic; non-manifold → bbox fallback + `low` confidence

## 2. Material estimate (`lib/quoting/materialEstimate.js`)
- [ ] 2.1 Unit tests: weight scales with volume, infill, and per-material density;
      shell fraction clamped; 100% infill ≈ solid weight
- [ ] 2.2 Implement weight estimation; per-material densities in `pricingDefaults.js`

## 3. Print-time estimate (`lib/quoting/printTimeEstimate.js`)
- [ ] 3.1 Unit tests: time increases with volume, decreases with thicker layers,
      increases with walls/support; returns hours > 0
- [ ] 3.2 Implement heuristic behind `estimatePrintHours(metrics, settings)` interface

## 4. Quote composition (`lib/quoting/quote.js`)
- [ ] 4.1 Unit tests for all seven factors individually (material, print time,
      base, post-processing, special request, priority, delivery)
- [ ] 4.2 Unit tests for expedite (percent vs flat vs greater-of) and minimum price
- [ ] 4.3 Unit tests for itemized breakdown shape, subtotal/total math, confidence
- [ ] 4.4 Implement `calculateInstantQuote`; reuse `deliveryPriceCalculator` for delivery

## 5. Pricing config (`models/AppSettings.js`)
- [ ] 5.1 Add fields: per-material density/rate, `printTimeRatePerHour`,
      `postProcessingFee`, `specialRequestFee`, `priorityFee`,
      `expediteSurchargePercent`, `expediteSurchargeFlat`, `minimumPrice`
- [ ] 5.2 Defaults applied; migration-safe (existing docs read with defaults)
- [ ] 5.3 Admin settings UI to edit the new fields

## 6. Quote API (`app/api/quote/route.js`)
- [ ] 6.1 Integration test (mock Mongoose/AppSettings): POST metrics+settings → itemized quote
- [ ] 6.2 Integration test: server ignores any client-sent price (recompute authoritative)
- [ ] 6.3 Implement route: auth optional for preview, read AppSettings, return breakdown

## 7. Editor quote panel (`components/Editor/QuotePanel.jsx`)
- [ ] 7.1 Store: capture `geometryMetrics` after model load; add `quote` state
- [ ] 7.2 Component test (RTL): renders itemized lines, total, expedite toggle,
      low-confidence warning
- [ ] 7.3 Recompute (debounced) on settings change; match design system
- [ ] 7.4 "Get final quote" → `POST /api/quote`; reconcile with server value

## 8. Persist quote onto request (`models/CustomPrintRequest.js`)
- [ ] 8.1 Add `quote` sub-doc + `quotedAt`; integration test for save + status → `quoted`
- [ ] 8.2 Auto-quote on configure; retain admin override path

## 9. Wire-up & regression
- [ ] 9.1 Full editor flow: upload → configure → live quote → submit → `quoted`
- [ ] 9.2 Verify cart/checkout uses persisted quote total (existing fixed-price path)
- [ ] 9.3 `yarn test:run` green; manual browser check of `/editor`

## 10. Spec fold-down
- [ ] 10.1 Update `openspec/specs/*` from deltas; archive this change
