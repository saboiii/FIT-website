/**
 * Server-side geometry recomputation for tamper-resistant quotes. Given a stored
 * model's bytes + filename, recompute the pricing metrics on the server instead
 * of trusting client-sent values. STL only for now; other formats return null so
 * the caller falls back to client metrics (see openspec change
 * `add-server-side-geometry-verification`).
 */
import { parseStlToPositions } from './stl'
import { computeGeometryMetrics } from './geometryVolume'

export function recomputeMetricsFromModel(buffer, fileName) {
  const ext = String(fileName || '').toLowerCase().split('.').pop()
  if (ext !== 'stl') return null // only STL supported server-side for now
  const positions = parseStlToPositions(buffer)
  if (!positions || positions.length < 9) return null
  return computeGeometryMetrics({ positions, index: null, sourceUnit: 'mm' })
}
