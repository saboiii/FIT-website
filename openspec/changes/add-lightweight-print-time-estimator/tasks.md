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

## 3. Wiring + validation (BLOCKED — needs product decision + real-model validation)
- [ ] 3.1 **Decide the integration point.** The live quote is server-authoritative
      and `/api/quote` accepts geometry METRICS only (by design — see
      `instant-quoting-engine` spec). A client-side layer-stack number can be
      displayed, but cannot feed the priced quote without either (a) server-side
      recompute from the stored model in the persist path (positions are already
      available there via `recomputeMetricsFromModel`), or (b) accepting a
      client-sent shape factor (rejected: tamper vector). Recommend (a).
- [ ] 3.2 **Validate against real prints** before pricing with it: compare
      heuristic vs layer-stack vs actual slicer/printer times on the print
      farm's reference models; tune `flowMm3PerS` / `perLayerOverheadS`.
      Owner: client / print-farm operator.
- [ ] 3.3 After validation: feature-flag the swap behind the
      `estimatePrintHours` seam (heuristic remains the fallback), add the spec
      delta (print-time becomes shape-aware), and wire the worker into the
      editor for the displayed (non-priced) time estimate.
