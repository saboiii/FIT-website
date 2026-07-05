# Tasks: Lightweight Layer-Stack Print-Time Estimator

## 1. Pure estimator core (done 2026-06-12)
- [x] 1.1 `lib/quoting/printTime/layerStack.js` —
      `estimatePrintHoursLayerStack({ positions, sourceUnit, settings }, model)`:
      per-sampled-layer triangle∩plane slicing (exact cross-section perimeter),
      occupancy-grid + exterior flood-fill area, wall/infill extrusion volume ÷
      flow rate, fixed per-layer overhead, support multiplier. Bounded by
      `maxSampledLayers` (200) and `maxGridDim` (256)².
- [x] 1.2 Unit tests (`tests/unit/layerStack.test.js`): cube slice
      perimeter/area sanity, **slab-vs-tower ordering regression** (equal
      volume; the volume-only heuristic can't separate them), layer-height /
      infill / support monotonicity, unit conversion (cm vs mm), bounded cost on
      a 300mm model, empty-geometry zeros.

## 2. Worker wrapper (done 2026-06-12)
- [x] 2.1 `lib/quoting/printTime/layerStack.worker.js` — module-worker wrapper
      posting `{ok, hours}` / `{ok:false, error}` so callers can fall back to
      the heuristic. (Headless-verifiable only as a module; browser execution is
      covered by the wiring task below.)

## 3. Wiring + validation
- [x] 3.1 **Integration point chosen: (a) server-side recompute.** Done
      2026-06-22 — `recomputeMetricsFromModel(buffer, name, settings)` also runs
      the layer-stack estimator on the parsed positions, and the persist branch
      of `POST /api/quote` records it as `quote.inputs.printHoursShapeAware` on
      the `CustomPrintRequest`. **Informational only** — the priced quote still
      uses the volume-only heuristic, so no total changes. Resolves the
      proposal's open question ("quote both numbers for comparison until we trust
      the new model"). Option (b) (client-sent shape factor) stays rejected.
- [ ] 3.2 **Validate against real prints** before pricing with it: compare
      heuristic vs layer-stack vs actual slicer/printer times on the print
      farm's reference models; tune `flowMm3PerS` / `perLayerOverheadS`.
      Owner: client / print-farm operator.
      *(Harness built 2026-07-05 — the operator's job is now: print 3+
      shape-diverse models, note wall-clock hours, fill a CSV, run
      `node scripts/validate-print-times.mjs samples.csv`. The script
      compares both estimators against actual times and least-squares fits
      the two constants — `lib/quoting/printTime/validate.js` (pure, tested:
      recovers known constants exactly; rejects same-shape or inconsistent
      data), `layerStackComponents`/`hoursFromLayerStackComponents` extracted
      from the estimator with identical numerics. Awaiting REAL print data —
      constants must not ship from synthetic fits.)*
- [ ] 3.3 After validation: feature-flag the swap behind the
      `estimatePrintHours` seam (heuristic remains the fallback), add the spec
      delta (print-time becomes shape-aware), and wire the worker into the
      editor for the displayed (non-priced) time estimate.
