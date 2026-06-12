/**
 * Heuristic print-time estimate (hours). Pure and dependency-free.
 *
 * v1 heuristic: time ≈ extruded material volume / volumetric flow, scaled by a
 * layer-height factor (thinner layers → more passes → slower), wall loops, and a
 * support penalty. Deliberately behind a single interface so a slicer-accurate
 * estimator (cura-wasm) can replace it without touching the quote composer.
 * See openspec change `add-slicer-accurate-estimation`.
 *
 * A shape-aware alternative exists in ./printTime/layerStack.js (per-layer
 * perimeter + infill from mesh slices). It needs raw positions, which the
 * server-authoritative /api/quote deliberately does not accept, so it is NOT
 * wired in yet — adopting it for the priced quote means recomputing it
 * server-side from the stored model. See `add-lightweight-print-time-estimator`.
 */
import { DEFAULT_TIME_MODEL } from './pricingDefaults'
import { effectiveFillFraction } from './materialEstimate'

export function estimatePrintHours(
  {
    volumeCm3 = 0,
    dimensionsCm,
    infillPercent = 20,
    wallLoops = 2,
    nozzleMm = 0.4,
    layerHeightMm = 0.2,
    enableSupport = false,
  } = {},
  model = DEFAULT_TIME_MODEL,
) {
  if (!(volumeCm3 > 0)) return 0
  const fill = effectiveFillFraction({ dimensionsCm, infillPercent, wallLoops, nozzleMm })
  const extrudedCm3 = volumeCm3 * fill
  const layerFactor = model.layerHeightRefMm / Math.max(0.01, layerHeightMm)
  const wallFactor = 1 + model.wallTimeFactorPerLoop * Math.max(0, wallLoops)
  const supportFactor = enableSupport ? model.supportTimeFactor : 1
  const hours = (extrudedCm3 / model.baseFlowCm3PerHour) * layerFactor * wallFactor * supportFactor
  return Math.max(model.minHours, hours)
}
