import { describe, it, expect } from 'vitest'
import {
  meshVolume,
  boundingBox,
  isWatertight,
  computeGeometryMetrics,
} from '@/lib/quoting/geometryVolume'

// Build a closed axis-aligned box of given size centred at `origin`.
// Returns { positions, index } (indexed cube, 8 verts, 12 triangles).
function makeBox(sx, sy, sz, origin = [0, 0, 0]) {
  const [ox, oy, oz] = origin
  const x = sx / 2
  const y = sy / 2
  const z = sz / 2
  const positions = [
    ox - x, oy - y, oz - z, // 0
    ox + x, oy - y, oz - z, // 1
    ox + x, oy + y, oz - z, // 2
    ox - x, oy + y, oz - z, // 3
    ox - x, oy - y, oz + z, // 4
    ox + x, oy - y, oz + z, // 5
    ox + x, oy + y, oz + z, // 6
    ox - x, oy + y, oz + z, // 7
  ]
  const index = [
    0, 1, 2, 0, 2, 3, // -z
    4, 6, 5, 4, 7, 6, // +z
    0, 4, 5, 0, 5, 1, // -y
    1, 5, 6, 1, 6, 2, // +x
    2, 6, 7, 2, 7, 3, // +y
    3, 7, 4, 3, 4, 0, // -x
  ]
  return { positions, index }
}

describe('meshVolume', () => {
  it('computes the volume of a unit cube (winding-independent)', () => {
    const { positions, index } = makeBox(1, 1, 1)
    expect(meshVolume(positions, index)).toBeCloseTo(1, 6)
  })

  it('scales with dimensions and is translation-invariant', () => {
    const { positions, index } = makeBox(2, 3, 4, [10, -5, 7])
    expect(meshVolume(positions, index)).toBeCloseTo(24, 6)
  })

  it('works for non-indexed geometry', () => {
    const { positions, index } = makeBox(2, 2, 2)
    // expand to non-indexed
    const flat = []
    for (let i = 0; i < index.length; i++) {
      const o = index[i] * 3
      flat.push(positions[o], positions[o + 1], positions[o + 2])
    }
    expect(meshVolume(flat, null)).toBeCloseTo(8, 6)
  })

  it('returns 0 for empty/degenerate geometry', () => {
    expect(meshVolume([], null)).toBe(0)
    expect(meshVolume([0, 0, 0], null)).toBe(0)
  })
})

describe('boundingBox', () => {
  it('returns size and extents', () => {
    const { positions } = makeBox(2, 4, 6, [1, 1, 1])
    const bb = boundingBox(positions)
    expect(bb.size).toEqual([2, 4, 6])
  })
})

describe('isWatertight', () => {
  it('is true for a closed box', () => {
    const { positions, index } = makeBox(1, 1, 1)
    expect(isWatertight(positions, index)).toBe(true)
  })

  it('is false for an open box (missing a face)', () => {
    const { positions, index } = makeBox(1, 1, 1)
    const open = index.slice(0, index.length - 6) // drop the last face (2 triangles)
    expect(isWatertight(positions, open)).toBe(false)
  })
})

describe('computeGeometryMetrics', () => {
  it('reports cm³ volume and cm dimensions for an mm-unit model', () => {
    const { positions, index } = makeBox(10, 10, 10) // 10mm cube
    const m = computeGeometryMetrics({ positions, index, sourceUnit: 'mm' })
    expect(m.volumeCm3).toBeCloseTo(1, 6) // 1000 mm³ = 1 cm³
    expect(m.dimensionsCm.length).toBeCloseTo(1, 6)
    expect(m.confidence).toBe('high')
    expect(m.watertight).toBe(true)
  })

  it('converts glTF metre units to cm', () => {
    const { positions, index } = makeBox(0.01, 0.01, 0.01) // 1cm cube in metres
    const m = computeGeometryMetrics({ positions, index, sourceUnit: 'm' })
    expect(m.volumeCm3).toBeCloseTo(1, 6)
    expect(m.dimensionsCm.height).toBeCloseTo(1, 6)
  })

  it('falls back to bounding-box volume with low confidence for non-watertight meshes', () => {
    const { positions, index } = makeBox(2, 2, 2, [0, 0, 0]) // sourceUnit cm
    const open = index.slice(0, index.length - 6)
    const m = computeGeometryMetrics({ positions, index: open, sourceUnit: 'cm' })
    expect(m.confidence).toBe('low')
    expect(m.watertight).toBe(false)
    expect(m.volumeCm3).toBeCloseTo(8, 6) // bounding-box volume (2×2×2)
  })

  it('returns zero metrics for empty geometry', () => {
    const m = computeGeometryMetrics({ positions: [], sourceUnit: 'mm' })
    expect(m.volumeCm3).toBe(0)
    expect(m.confidence).toBe('low')
  })
})
