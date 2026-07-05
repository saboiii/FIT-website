# Design: Layer-Stack Print-Time Estimator

## Algorithm (implemented in `lib/quoting/printTime/layerStack.js`)

Per sampled Z plane (at most `maxSampledLayers` = 200 slices, each scaled by
`realLayers / sampledLayers` so totals reflect the true layer count):

1. **Slice**: intersect every triangle with the plane; each crossing triangle
   yields a 2D segment. The summed segment length is the *exact* cross-section
   perimeter for a manifold mesh — no silhouette approximation needed for
   walls.
2. **Area**: rasterize the segments into an occupancy grid (cell =
   max(0.8mm, span/256)), flood-fill the exterior from the grid border, and
   count interior cells (boundary cells count half). This is the proposal's
   "coarse grid" with the cell size auto-clamped so memory is bounded at
   258×258 bytes per slice regardless of model size.
3. **Extrusion**: `walls = perimeter × wallLoops × nozzle × layerHeight`;
   `infill = max(0, area − wallFootprint) × infill% × layerHeight`.
4. **Time**: `Σ extruded / flowMm3PerS + totalLayers × perLayerOverheadS`,
   ×`supportTimeFactor` when supports are on, floored at `minHours`.

The per-layer overhead term is what makes the estimator shape-aware: a
10×10×80mm tower and a 40×40×5mm slab have identical volume (the v1 heuristic
prices them identically — pinned by a regression test) but 400 vs 25 layers.

## Decisions

- **Sampling instead of every layer**: a 300mm model at 0.1mm is 3000 layers;
  slicing all of them in JS is wasteful when adjacent slices are nearly
  identical. 200 evenly-spaced measured slices scaled up keeps worst-case cost
  ~200 × (O(tris) + 256² flood fill) ≈ tens of ms for test meshes, bounded for
  big ones.
- **Defaults** (`DEFAULT_LAYER_STACK_MODEL`): `flowMm3PerS = 10`,
  `perLayerOverheadS = 3` — mid-range FDM ballpark, deliberately conservative;
  both are placeholders until task 3.2 validates against the print farm's real
  machines. Do not price with these unvalidated.
- **Units**: input accepts the adapter convention (`mm` default, `cm`, `m`) so
  it can consume either editor positions or server-parsed positions
  (`lib/quoting/serverGeometry.js`) unchanged.

## Why wiring is deferred (the seam)

`/api/quote` accepts geometry metrics only — raw positions are rejected by the
strict zod schema, deliberately (payload size, tamper surface). So the
layer-stack number cannot flow client→server into the priced quote. The
integration that preserves server-authoritative pricing is to run this
estimator **server-side in the persist path**, where
`recomputeMetricsFromModel` already parses the stored model to positions
(STL/OBJ/glTF/3MF). That changes persisted totals vs the live preview, so it
must wait for the task 3.2 validation and a product sign-off (task 3.1).
Until then the heuristic remains the only estimator feeding prices, and this
module ships dark (pure + tested, no callers).
