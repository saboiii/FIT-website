/**
 * Server-side geometry recomputation for tamper-resistant quotes. Given a stored
 * model's bytes + filename, recompute the pricing metrics on the server instead
 * of trusting client-sent values. Supports STL, OBJ, glTF/GLB, and 3MF; other
 * formats (and unparseable files) return null so the caller falls back to
 * client metrics (see openspec change `add-server-side-geometry-verification`).
 *
 * Source units mirror the client adapter (lib/quoting/threeGeometryAdapter.js):
 * STL/OBJ/3MF are millimetres, glTF/GLB are metres — so a client and server
 * recompute of the same file agree and deviation logging stays meaningful.
 */
import { parseStlToPositions } from './stl'
import { parseObjToPositions } from './obj'
import { parseGltfToPositions } from './gltf'
import { parse3mfToPositions } from './threeMf'
import { computeGeometryMetrics } from './geometryVolume'

const PARSERS = {
  stl: { parse: parseStlToPositions, sourceUnit: 'mm' },
  obj: { parse: parseObjToPositions, sourceUnit: 'mm' },
  glb: { parse: parseGltfToPositions, sourceUnit: 'm' },
  gltf: { parse: parseGltfToPositions, sourceUnit: 'm' },
  '3mf': { parse: parse3mfToPositions, sourceUnit: 'mm' },
}

function extensionOf(fileName) {
  return String(fileName || '').toLowerCase().split('.').pop()
}

/** Whether the file format can be recomputed server-side (worth an S3 fetch). */
export function supportsServerRecompute(fileName) {
  return Object.prototype.hasOwnProperty.call(PARSERS, extensionOf(fileName))
}

/**
 * Recompute geometry metrics from a stored model's bytes.
 * @returns {Promise<object|null>} metrics from computeGeometryMetrics, or null
 *   when the format is unsupported or the file cannot be parsed
 */
export async function recomputeMetricsFromModel(buffer, fileName) {
  const entry = PARSERS[extensionOf(fileName)]
  if (!entry) return null
  const positions = await entry.parse(buffer)
  if (!positions || positions.length < 9) return null
  return computeGeometryMetrics({ positions, index: null, sourceUnit: entry.sourceUnit })
}
