/**
 * Machine capacity limits (print-farm build volume / weight), configured by the
 * admin in AppSettings.machineLimits. Pure check used by the quote API and the
 * admin dimension endpoints. A null/unset limit means "no limit" — the
 * mechanism ships before the farm's real numbers are entered, and nothing is
 * enforced until the admin fills them in (Admin → Quoting & Pricing).
 */

const LIMIT_FIELDS = [
  ['maxLengthCm', 'length', 'cm'],
  ['maxWidthCm', 'width', 'cm'],
  ['maxHeightCm', 'height', 'cm'],
]

/**
 * @param {{length:number,width:number,height:number}} dimensionsCm
 * @param {number|null} weightKg
 * @param {{maxLengthCm,maxWidthCm,maxHeightCm,maxWeightKg}|null} limits
 * @returns {{fits:boolean, violations:Array<{field:string,value:number,limit:number,unit:string}>}}
 */
export function checkMachineLimits(dimensionsCm, weightKg, limits) {
  const violations = []
  if (!limits) return { fits: true, violations }
  for (const [limitKey, dimKey, unit] of LIMIT_FIELDS) {
    const limit = Number(limits[limitKey])
    const value = Number(dimensionsCm?.[dimKey])
    if (Number.isFinite(limit) && limit > 0 && Number.isFinite(value) && value > limit) {
      violations.push({ field: dimKey, value, limit, unit })
    }
  }
  const maxWeightKg = Number(limits.maxWeightKg)
  const w = Number(weightKg)
  if (Number.isFinite(maxWeightKg) && maxWeightKg > 0 && Number.isFinite(w) && w > maxWeightKg) {
    violations.push({ field: 'weight', value: w, limit: maxWeightKg, unit: 'kg' })
  }
  return { fits: violations.length === 0, violations }
}

/** Human-readable message for a violations list (customer-safe). */
export function machineLimitMessage(violations) {
  if (!violations?.length) return ''
  const parts = violations.map(
    (v) => `${v.field} ${v.value.toFixed(1)} ${v.unit} exceeds our maximum of ${v.limit} ${v.unit}`,
  )
  return `This model is larger than we can print: ${parts.join('; ')}. ` +
    'Please scale it down or contact us for options.'
}
