/**
 * Shape-aware, layer-stack print-time estimator. Pure and dependency-free.
 *
 * Where the v1 heuristic (lib/quoting/printTimeEstimate.js) sees only volume,
 * this walks the model layer by layer: each sampled Z plane is sliced against
 * the triangle mesh, giving the true cross-section perimeter (sum of
 * triangle-plane intersection segments) and an occupancy-grid area (segments
 * rasterized, exterior flood-filled). Per layer, wall + infill extrusion volume
 * is divided by a volumetric flow rate, and a fixed per-layer overhead (Z move,
 * travel, retraction) is charged — which is exactly what makes a tall tower
 * slower than a flat slab of equal volume.
 *
 * Cost is bounded: at most `maxSampledLayers` slices are measured (each scaled
 * to represent its share of the real layer count) and grids are capped at
 * `maxGridDim`² cells. Implements the same conceptual interface as
 * `estimatePrintHours` so it can swap in behind the engine's slicer seam — see
 * openspec change `add-lightweight-print-time-estimator` for wiring status.
 */

export const DEFAULT_LAYER_STACK_MODEL = Object.freeze({
  flowMm3PerS: 10, // effective melted-material throughput
  perLayerOverheadS: 3, // Z-hop, travel, retractions per layer
  cellMm: 0.8, // occupancy-grid resolution (≈ 2 × nozzle)
  maxGridDim: 256, // grid cells per axis cap (memory/CPU bound)
  maxSampledLayers: 200, // slices actually measured (scaled to real count)
  supportTimeFactor: 1.25, // multiplier when supports are enabled (mirrors v1)
  minHours: 0.05,
})

const UNIT_TO_MM = { mm: 1, cm: 10, m: 1000 }

/**
 * Cross-section of a triangle soup at plane z (all units mm).
 * Returns the slice perimeter (exact for manifold meshes: summed
 * triangle∩plane segment lengths) and an occupancy-grid area estimate.
 */
export function sliceStats(positions, zMm, { cellMm = 0.8, maxGridDim = 256 } = {}) {
  const segments = []
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  let perimeterMm = 0

  for (let t = 0; t + 8 < positions.length; t += 9) {
    const pts = []
    for (let e = 0; e < 3; e++) {
      const i0 = t + e * 3
      const i1 = t + ((e + 1) % 3) * 3
      const az = positions[i0 + 2]
      const bz = positions[i1 + 2]
      if ((az < zMm) === (bz < zMm)) continue // edge does not cross the plane
      const f = (zMm - az) / (bz - az)
      pts.push([
        positions[i0] + f * (positions[i1] - positions[i0]),
        positions[i0 + 1] + f * (positions[i1 + 1] - positions[i0 + 1]),
      ])
    }
    if (pts.length !== 2) continue
    const [a, b] = pts
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    if (!(len > 0)) continue
    perimeterMm += len
    segments.push([a, b, len])
    minX = Math.min(minX, a[0], b[0])
    maxX = Math.max(maxX, a[0], b[0])
    minY = Math.min(minY, a[1], b[1])
    maxY = Math.max(maxY, a[1], b[1])
  }

  if (segments.length === 0) return { areaMm2: 0, perimeterMm: 0 }

  // Occupancy grid with a 1-cell empty border so the exterior is connected.
  const spanX = maxX - minX
  const spanY = maxY - minY
  const cell = Math.max(cellMm, Math.max(spanX, spanY) / maxGridDim)
  const nx = Math.min(maxGridDim, Math.max(1, Math.ceil(spanX / cell))) + 2
  const ny = Math.min(maxGridDim, Math.max(1, Math.ceil(spanY / cell))) + 2
  const grid = new Uint8Array(nx * ny) // 0 empty, 1 boundary, 2 exterior
  const cellOf = (x, y) => {
    const cx = Math.min(nx - 2, Math.max(1, 1 + Math.floor((x - minX) / cell)))
    const cy = Math.min(ny - 2, Math.max(1, 1 + Math.floor((y - minY) / cell)))
    return cy * nx + cx
  }

  for (const [a, b, len] of segments) {
    const steps = Math.max(1, Math.ceil((len / cell) * 2)) // supercover sampling
    for (let s = 0; s <= steps; s++) {
      const f = s / steps
      grid[cellOf(a[0] + f * (b[0] - a[0]), a[1] + f * (b[1] - a[1]))] = 1
    }
  }

  // Flood-fill the exterior from the border; what's left inside is the part.
  const queue = []
  for (let x = 0; x < nx; x++) queue.push(x, (ny - 1) * nx + x)
  for (let y = 0; y < ny; y++) queue.push(y * nx, y * nx + nx - 1)
  while (queue.length) {
    const i = queue.pop()
    if (grid[i] !== 0) continue
    grid[i] = 2
    const x = i % nx
    if (x > 0) queue.push(i - 1)
    if (x < nx - 1) queue.push(i + 1)
    if (i >= nx) queue.push(i - nx)
    if (i < nx * (ny - 1)) queue.push(i + nx)
  }

  let boundary = 0
  let interior = 0
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] === 1) boundary++
    else if (grid[i] === 0) interior++
  }
  // Boundary cells straddle the outline: count them half in, half out.
  const areaMm2 = (interior + boundary * 0.5) * cell * cell
  return { areaMm2, perimeterMm }
}

/**
 * Estimate print time in hours from raw triangle positions.
 * @param {object} input
 * @param {number[]|Float32Array} input.positions - flat [x,y,z,...] triangle soup
 * @param {'mm'|'cm'|'m'} [input.sourceUnit='mm'] - same convention as the
 *   geometry adapter (STL/OBJ/3MF mm, glTF m)
 * @param {object} [input.settings] - infillPercent, wallLoops, nozzleMm,
 *   layerHeightMm, enableSupport (same shape as estimatePrintHours settings)
 * @param {object} [model] - DEFAULT_LAYER_STACK_MODEL overrides
 * @returns {number} estimated hours (0 for empty geometry)
 */
export function estimatePrintHoursLayerStack(
  { positions, sourceUnit = 'mm', settings = {} } = {},
  model = DEFAULT_LAYER_STACK_MODEL,
) {
  if (!positions || positions.length < 9) return 0
  const unitScale = UNIT_TO_MM[sourceUnit] ?? 1
  let pts = positions
  if (unitScale !== 1) {
    pts = new Float64Array(positions.length)
    for (let i = 0; i < positions.length; i++) pts[i] = positions[i] * unitScale
  }

  let zMin = Infinity
  let zMax = -Infinity
  for (let i = 2; i < pts.length; i += 3) {
    if (pts[i] < zMin) zMin = pts[i]
    if (pts[i] > zMax) zMax = pts[i]
  }
  const heightMm = zMax - zMin
  if (!(heightMm > 0)) return 0

  const {
    infillPercent = 20,
    wallLoops = 2,
    nozzleMm = 0.4,
    layerHeightMm = 0.2,
    enableSupport = false,
  } = settings
  const layerH = Math.max(0.05, layerHeightMm)
  const infill = Math.min(1, Math.max(0, infillPercent / 100))

  const totalLayers = Math.max(1, Math.ceil(heightMm / layerH))
  const sampled = Math.min(totalLayers, model.maxSampledLayers)
  const sliceStep = heightMm / sampled
  const layersPerSample = totalLayers / sampled

  let extrudedMm3 = 0
  for (let s = 0; s < sampled; s++) {
    const z = zMin + (s + 0.5) * sliceStep
    const { areaMm2, perimeterMm } = sliceStats(pts, z, model)
    const wallMm3 = perimeterMm * Math.max(0, wallLoops) * nozzleMm * layerH
    const wallFootprintMm2 = perimeterMm * Math.max(0, wallLoops) * nozzleMm
    const infillMm3 = Math.max(0, areaMm2 - wallFootprintMm2) * infill * layerH
    extrudedMm3 += (wallMm3 + infillMm3) * layersPerSample
  }

  let seconds = extrudedMm3 / model.flowMm3PerS + totalLayers * model.perLayerOverheadS
  if (enableSupport) seconds *= model.supportTimeFactor
  return Math.max(model.minHours, seconds / 3600)
}
