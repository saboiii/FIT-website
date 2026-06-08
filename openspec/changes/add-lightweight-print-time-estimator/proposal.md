# Proposal: Lightweight Layer-Stack Print-Time Estimator (alternative to WASM)

> Status: backlog (proposal only). Alternative to the deferred
> `add-slicer-accurate-estimation` (cura-wasm). No code change yet — this scopes a
> follow-up implementation. Depends on `add-instant-quoting-engine`.

## Why

The current `estimatePrintHours` ([lib/quoting/printTimeEstimate.js]) uses a
volume-only heuristic: `hours = volume / baseFlowCm3PerHour` adjusted for layer
height, walls, and support. It is fast and dependency-free, but it ignores the
*shape* of the model — a tall thin tower and a flat slab of the same volume take
very different times to print. cura-wasm (the `add-slicer-accurate-estimation`
change) would give true slicer numbers, but at the cost of a multi-megabyte WASM
payload, seconds-to-minutes of slice latency, and a Web Worker that's hard to
verify headlessly. The client doesn't want that weight.

A **layer-stack heuristic** uses the geometry the engine already has (vertex
positions + bounding box) to estimate print-path length per layer without
running a slicer:

1. Per layer (Z step = layer height), compute the **2D silhouette** of the mesh
   (project triangles intersecting that Z range onto XY).
2. Approximate **perimeter** (walls extruded length per loop) and **infill area**
   (fraction inside the silhouette) for that layer.
3. Sum across layers to get total extruded filament length, then divide by an
   effective flow rate (mm³/s of melted material at a given nozzle/layer).
4. Add per-layer fixed costs (Z-hop, travel) and a support multiplier.

This stays pure JS, runs in a Web Worker so the main thread is free, and gives
shape-aware estimates without the WASM bloat.

## What Changes

- New `lib/quoting/printTime/layerStack.js` exporting
  `estimatePrintHoursLayerStack({ positions, dimensionsCm, settings })` — pure,
  same interface as the existing heuristic so it can drop in via
  `printTimeEstimate.js`'s slicer-swappable seam.
- New `lib/quoting/printTime/layerStack.worker.js` — a Web Worker wrapper that
  calls the pure function and posts the result. Avoids blocking the main thread
  for larger meshes.
- `QuotePanel` debouncer can optionally invoke the worker; falls back to the
  current heuristic on worker error / unsupported environment.

### Algorithm sketch (per layer)

```
silhouette = project(triangles where minZ <= layerZ <= maxZ)
perimeter  = approx_perimeter(silhouette)
fillArea   = silhouette_area * (infill/100)
extruded   = (perimeter * wallLoops + fillArea / nozzleMm) * layerHeightMm * nozzleMm
totalMm³  += extruded
```

Approximate silhouette area + perimeter from the convex hull or a regular grid
sample at a coarse resolution (e.g. 1mm cells) so the per-layer cost is bounded.

## Impact

- **Specs:** `instant-quoting-engine` (the print-time estimator becomes
  shape-aware; the existing volume heuristic stays as a fallback).
- **Code:** new files only (above). Optional wiring into `QuotePanel` via a
  feature flag so the heuristic remains the default until the layer-stack model
  is validated.
- **Tests:** pure layer-stack function is unit-testable on small synthetic
  meshes (e.g. a unit cube, a tall cylinder, a flat slab); a regression test
  asserts the relative ordering (slab vs tower) the volume-only heuristic misses.
- **Risks:** silhouette quality vs cost — too coarse grids underestimate, too
  fine grids stall the worker. We pick a default cell size (e.g. nozzle×2 = 0.8mm)
  with an override hatch. Memory: per-layer occupancy grids on big models — cap
  layer count or downsample.
- **Out of scope:** real G-code generation, true acceleration profiles, multi-
  material toolpath optimisation. For higher-value or contested quotes,
  `add-slicer-accurate-estimation` (cura-wasm) remains the future path.

## Open questions (resolve when implementing)

- What grid resolution gives the best accuracy/perf trade-off on a 50MB model?
- Does the layer-stack estimator need to know the printer's max travel speed, or
  is a single flow constant good enough?
- Should the engine quote both numbers (heuristic + layer-stack) for admin
  comparison until we trust the new model?
