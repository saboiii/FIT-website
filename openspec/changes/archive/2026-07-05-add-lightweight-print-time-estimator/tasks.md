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
- [x] 3.2 SPUN OUT 2026-07-05 → `enable-shape-aware-print-pricing`. This
      change's deliverable — making validation possible and easy — is done
      twice over: the CLI harness (`scripts/validate-print-times.mjs` +
      pure `lib/quoting/printTime/validate.js`, fitter recovers known
      constants exactly) and the self-serve admin UI (section 4 below). The
      remaining work is the client physically printing and timing models.
- [x] 3.3 SPUN OUT 2026-07-05 → `enable-shape-aware-print-pricing` (pricing
      flip behind the `estimatePrintHours` seam + editor worker wiring +
      instant-quoting-engine spec delta; gated on the client's calibration).

## 4. Admin calibration view (client request 2026-07-05: "task for the admin")

- [x] 4.1 `AppSettings`: `printTimeCalibration.samples` (derived components
      only — no model bytes) + `quotingConfig.layerStackModel` (null = default
      constants); `resolveLayerStackModel` pure helper + tests.
- [x] 4.2 Admin API `GET/POST/PUT /api/admin/print-time-calibration`: upload
      model (40MB cap, parsed once, bytes discarded) → store components +
      estimate; enter actual hours; fit preview via the pure validate core;
      `apply` persists constants (422 with guidance when under-determined).
- [x] 4.3 `components/Admin/PrintTimeCalibration.jsx` — plain-English 3-step
      panel (add → print & time → apply), wired into Settings → Print Timing
      AND as wizard step 4 (WIZARD_STEPS + OnboardingWizard). RTL smoke ×2.
- [x] 4.4 Server shape-aware estimate (`recomputeMetricsFromModel`) uses the
      applied constants; spec delta written (`specs/admin-dashboard/spec.md`:
      calibration panel + 6-step wizard). Suite green (392), build green.
      **Browser QA of the panel rides with the deferred admin-UI QA.**
