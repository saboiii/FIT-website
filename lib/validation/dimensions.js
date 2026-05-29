/**
 * Structural validation for a `dimensions` object at admin write boundaries.
 * Pure + testable. Checks types/sign only — realistic max RANGE thresholds
 * (e.g. build-volume limits) are a product decision and intentionally NOT
 * enforced here. See openspec change `add-input-validation-admin-endpoints`.
 *
 * Units: length/width/height in cm, weight in kg (see CustomPrintRequest).
 */
export function validateDimensions(dimensions) {
  if (dimensions == null) return { ok: true, value: undefined }
  if (typeof dimensions !== 'object' || Array.isArray(dimensions)) {
    return { ok: false, error: 'dimensions must be an object' }
  }

  const out = {}
  for (const key of ['length', 'width', 'height', 'weight']) {
    const raw = dimensions[key]
    if (raw === undefined || raw === null || raw === '') continue
    const n = Number(raw)
    if (!Number.isFinite(n)) {
      return { ok: false, error: `dimensions.${key} must be a finite number` }
    }
    if (n < 0) {
      return { ok: false, error: `dimensions.${key} must not be negative` }
    }
    out[key] = n
  }
  return { ok: true, value: out }
}
