/**
 * Pure geometry metrics for the Instant Quoting Engine.
 *
 * Dependency-free by design: operates on a plain `positions` array (flat
 * [x,y,z, x,y,z, ...]) and an optional `index` array, so it is trivially
 * unit-testable without three.js or WebGL. A thin adapter
 * (lib/quoting/threeGeometryAdapter.js) extracts these from a THREE.BufferGeometry.
 *
 * Volume via the divergence theorem: sum of signed tetrahedron volumes
 * (v0 · (v1 × v2)) / 6 over triangle faces; abs() makes it winding-independent.
 */

function* faces(positions, index) {
  if (index && index.length >= 3) {
    for (let i = 0; i + 2 < index.length; i += 3) {
      yield [index[i], index[i + 1], index[i + 2]]
    }
  } else {
    const vertCount = positions.length / 3
    for (let i = 0; i + 2 < vertCount; i += 3) {
      yield [i, i + 1, i + 2]
    }
  }
}

function vert(positions, i) {
  const o = i * 3
  return [positions[o], positions[o + 1], positions[o + 2]]
}

/** Absolute mesh volume in the geometry's own (cubed) units. */
export function meshVolume(positions, index = null) {
  if (!positions || positions.length < 9) return 0
  let sum = 0
  for (const [ia, ib, ic] of faces(positions, index)) {
    const [ax, ay, az] = vert(positions, ia)
    const [bx, by, bz] = vert(positions, ib)
    const [cx, cy, cz] = vert(positions, ic)
    // a · (b × c)
    const crossX = by * cz - bz * cy
    const crossY = bz * cx - bx * cz
    const crossZ = bx * cy - by * cx
    sum += (ax * crossX + ay * crossY + az * crossZ) / 6
  }
  return Math.abs(sum)
}

/** Axis-aligned bounding box; returns { min, max, size } as [x,y,z] arrays. */
export function boundingBox(positions) {
  if (!positions || positions.length < 3) {
    return { min: [0, 0, 0], max: [0, 0, 0], size: [0, 0, 0] }
  }
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < positions.length; i += 3) {
    for (let c = 0; c < 3; c++) {
      const val = positions[i + c]
      if (val < min[c]) min[c] = val
      if (val > max[c]) max[c] = val
    }
  }
  return { min, max, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] }
}

/**
 * Watertight (manifold) check: every undirected edge must be shared by exactly
 * two faces. Vertices are welded by rounding to `precision` so it works for both
 * indexed and non-indexed (e.g. STL) geometry where coincident vertices are
 * duplicated.
 */
export function isWatertight(positions, index = null, precision = 1e-4) {
  if (!positions || positions.length < 9) return false
  const idOf = new Map()
  const weld = (i) => {
    const [x, y, z] = vert(positions, i)
    const key = `${Math.round(x / precision)},${Math.round(y / precision)},${Math.round(z / precision)}`
    let id = idOf.get(key)
    if (id === undefined) {
      id = idOf.size
      idOf.set(key, id)
    }
    return id
  }
  const edges = new Map()
  let faceCount = 0
  const addEdge = (a, b) => {
    if (a === b) return
    const key = a < b ? `${a}_${b}` : `${b}_${a}`
    edges.set(key, (edges.get(key) || 0) + 1)
  }
  for (const [ia, ib, ic] of faces(positions, index)) {
    faceCount++
    const a = weld(ia)
    const b = weld(ib)
    const c = weld(ic)
    addEdge(a, b)
    addEdge(b, c)
    addEdge(c, a)
  }
  if (faceCount === 0 || edges.size === 0) return false
  for (const count of edges.values()) {
    if (count !== 2) return false
  }
  return true
}

const UNIT_TO_CM = { mm: 0.1, cm: 1, m: 100 }

/**
 * Compute pricing-ready metrics from raw geometry data.
 * @param {object} input
 * @param {number[]|Float32Array} input.positions - flat [x,y,z,...]
 * @param {number[]|Uint32Array|null} [input.index]
 * @param {'mm'|'cm'|'m'} [input.sourceUnit='mm'] - STL/3MF=mm, glTF=m
 * @returns {{volumeCm3, dimensionsCm:{length,width,height}, watertight, confidence, meshVolumeCm3, boundingVolumeCm3}}
 */
export function computeGeometryMetrics({ positions, index = null, sourceUnit = 'mm' } = {}) {
  const lengthFactor = UNIT_TO_CM[sourceUnit] ?? UNIT_TO_CM.mm
  if (!positions || positions.length < 9) {
    return {
      volumeCm3: 0,
      dimensionsCm: { length: 0, width: 0, height: 0 },
      watertight: false,
      confidence: 'low',
      meshVolumeCm3: 0,
      boundingVolumeCm3: 0,
    }
  }
  const bb = boundingBox(positions)
  const dimensionsCm = {
    length: bb.size[0] * lengthFactor,
    width: bb.size[1] * lengthFactor,
    height: bb.size[2] * lengthFactor,
  }
  const boundingVolumeCm3 = dimensionsCm.length * dimensionsCm.width * dimensionsCm.height
  const meshVolumeCm3 = meshVolume(positions, index) * lengthFactor ** 3
  const watertight = isWatertight(positions, index)

  // A trustworthy closed mesh has 0 < volume <= bounding-box volume. Otherwise
  // fall back to the bounding-box volume (an over-estimate) and flag low
  // confidence so the UI can warn and the price can be reviewed.
  const reliable = watertight && meshVolumeCm3 > 0 && meshVolumeCm3 <= boundingVolumeCm3 * 1.0001
  return {
    volumeCm3: reliable ? meshVolumeCm3 : boundingVolumeCm3,
    dimensionsCm,
    watertight,
    confidence: reliable ? 'high' : 'low',
    meshVolumeCm3,
    boundingVolumeCm3,
  }
}
