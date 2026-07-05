/**
 * Pure validation/tuning core for print-time estimators (openspec change
 * `add-lightweight-print-time-estimator`, task 3.2). No I/O — the CLI edge is
 * `scripts/validate-print-times.mjs`.
 *
 * Fitting: layer-stack seconds are linear in the two unknown constants,
 *   seconds = extrudedMm3 · (1/flowMm3PerS) + totalLayers · perLayerOverheadS
 * so real print times fit with ordinary least squares (2×2 normal equations).
 * Support-enabled samples are normalised by supportTimeFactor first.
 */
import { DEFAULT_LAYER_STACK_MODEL } from './layerStack.js'

/**
 * Per-sample % errors + aggregate stats for any set of named estimates.
 * @param {Array<{label: string, actualHours: number, estimates: Record<string, number>}>} samples
 * @returns {{rows: Array, summary: Record<string, {meanAbsPctError: number, meanPctBias: number}>}}
 */
export function comparePrintTimes(samples = []) {
  const rows = []
  const byEstimator = {}
  for (const s of samples) {
    if (!(s?.actualHours > 0)) continue
    const row = { label: s.label, actualHours: s.actualHours, errors: {} }
    for (const [name, est] of Object.entries(s.estimates || {})) {
      const pct = ((est - s.actualHours) / s.actualHours) * 100
      row.errors[name] = pct
      ;(byEstimator[name] = byEstimator[name] || []).push(pct)
    }
    rows.push(row)
  }
  const summary = {}
  for (const [name, errs] of Object.entries(byEstimator)) {
    summary[name] = {
      meanAbsPctError: errs.reduce((a, e) => a + Math.abs(e), 0) / errs.length,
      meanPctBias: errs.reduce((a, e) => a + e, 0) / errs.length,
    }
  }
  return { rows, summary }
}

/**
 * Least-squares fit of `flowMm3PerS`/`perLayerOverheadS` from measured prints.
 * @param {Array<{extrudedMm3: number, totalLayers: number, supportOn?: boolean,
 *   actualHours: number}>} samples - ≥2 shape-diverse samples required
 * @param {object} [model] - supplies supportTimeFactor for normalisation
 * @returns {{flowMm3PerS: number, perLayerOverheadS: number, samplesUsed: number}|null}
 *   null when the system is under-determined (too few samples, or all samples
 *   have proportional extruded/layer ratios) or a constant fits non-positive
 */
export function fitLayerStackConstants(samples = [], model = DEFAULT_LAYER_STACK_MODEL) {
  const usable = samples.filter(
    (s) => s && s.extrudedMm3 > 0 && s.totalLayers > 0 && s.actualHours > 0,
  )
  if (usable.length < 2) return null

  // Normal equations for seconds ≈ a·E + b·L (a = 1/flow, b = overhead).
  let sEE = 0
  let sEL = 0
  let sLL = 0
  let sES = 0
  let sLS = 0
  for (const s of usable) {
    const secs = (s.actualHours * 3600) / (s.supportOn ? model.supportTimeFactor : 1)
    sEE += s.extrudedMm3 * s.extrudedMm3
    sEL += s.extrudedMm3 * s.totalLayers
    sLL += s.totalLayers * s.totalLayers
    sES += s.extrudedMm3 * secs
    sLS += s.totalLayers * secs
  }
  const det = sEE * sLL - sEL * sEL
  // Degenerate when all samples share the same extruded:layers ratio — the two
  // constants can't be separated (print shape-diverse references: a slab AND a
  // tower). Relative epsilon guards float noise on near-proportional data.
  if (!(det > 1e-9 * sEE * sLL)) return null

  const a = (sES * sLL - sLS * sEL) / det
  const b = (sLS * sEE - sES * sEL) / det
  if (!(a > 0) || !(b >= 0)) return null

  return {
    flowMm3PerS: 1 / a,
    perLayerOverheadS: b,
    samplesUsed: usable.length,
  }
}
