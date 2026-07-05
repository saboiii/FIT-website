/**
 * Estimate filament/material usage (grams) from geometry + print settings.
 * Pure and dependency-free. weight = volume × effectiveFill × density, where
 * effectiveFill blends a solid shell (from walls/nozzle vs bounding box) with the
 * infill density. As infill → 100%, effectiveFill → 1 (solid weight).
 */
import { DEFAULT_MATERIAL_MODEL, DEFAULT_DENSITY } from './pricingDefaults.js'

/** Fraction of the part that is solid shell (skin from wall loops). 0..1. */
export function shellFraction(
  { dimensionsCm, wallLoops = 2, nozzleMm = 0.4 } = {},
  model = DEFAULT_MATERIAL_MODEL,
) {
  const { length = 0, width = 0, height = 0 } = dimensionsCm || {}
  const bboxVol = length * width * height
  if (!(bboxVol > 0)) return model.shellFractionMax
  const t = (Math.max(0, wallLoops) * Math.max(0, nozzleMm)) / 10 // mm → cm
  const innerVol =
    Math.max(0, length - 2 * t) * Math.max(0, width - 2 * t) * Math.max(0, height - 2 * t)
  const frac = 1 - innerVol / bboxVol
  return Math.min(model.shellFractionMax, Math.max(model.shellFractionMin, frac))
}

/** Effective solid fraction of the bounding volume actually filled with material. */
export function effectiveFillFraction(
  { dimensionsCm, infillPercent = 20, wallLoops = 2, nozzleMm = 0.4 } = {},
  model = DEFAULT_MATERIAL_MODEL,
) {
  const shell = shellFraction({ dimensionsCm, wallLoops, nozzleMm }, model)
  const infill = Math.min(1, Math.max(0, infillPercent / 100))
  return shell + (1 - shell) * infill
}

export function estimateMaterialGrams(
  {
    volumeCm3 = 0,
    dimensionsCm,
    infillPercent = 20,
    wallLoops = 2,
    nozzleMm = 0.4,
    densityGPerCm3 = DEFAULT_DENSITY,
  } = {},
  model = DEFAULT_MATERIAL_MODEL,
) {
  if (!(volumeCm3 > 0)) return 0
  const fill = effectiveFillFraction({ dimensionsCm, infillPercent, wallLoops, nozzleMm }, model)
  return volumeCm3 * fill * densityGPerCm3
}
