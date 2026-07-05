import { describe, it, expect } from 'vitest'
import { estimatePrintHoursLayerStack, sliceStats } from '@/lib/quoting/printTime/layerStack'
import { estimatePrintHours } from '@/lib/quoting/printTimeEstimate'

// Axis-aligned box mesh (12 triangles) of size [sx, sy, sz] mm centred at origin.
function boxPositions(sx, sy, sz) {
  const x = sx / 2, y = sy / 2, z = sz / 2
  const c = [
    [-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z],
    [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z],
  ]
  const idx = [
    0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6, 0, 4, 5, 0, 5, 1,
    1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0,
  ]
  const positions = []
  for (const i of idx) positions.push(...c[i])
  return positions
}

describe('sliceStats (single-layer cross-section)', () => {
  it('measures a 20mm square slice of a cube', () => {
    const positions = boxPositions(20, 20, 20)
    const { areaMm2, perimeterMm } = sliceStats(positions, 0)
    expect(perimeterMm).toBeCloseTo(80, 0) // 4 × 20mm
    expect(areaMm2).toBeGreaterThan(20 * 20 * 0.85)
    expect(areaMm2).toBeLessThan(20 * 20 * 1.15)
  })

  it('returns zeros for a plane that misses the mesh', () => {
    const positions = boxPositions(20, 20, 20)
    const { areaMm2, perimeterMm } = sliceStats(positions, 100)
    expect(areaMm2).toBe(0)
    expect(perimeterMm).toBe(0)
  })
})

describe('estimatePrintHoursLayerStack', () => {
  const settings = { infillPercent: 20, wallLoops: 2, nozzleMm: 0.4, layerHeightMm: 0.2 }

  it('returns positive finite hours for a cube', () => {
    const hours = estimatePrintHoursLayerStack({ positions: boxPositions(20, 20, 20), settings })
    expect(hours).toBeGreaterThan(0)
    expect(Number.isFinite(hours)).toBe(true)
  })

  it('returns 0 for empty geometry', () => {
    expect(estimatePrintHoursLayerStack({ positions: [], settings })).toBe(0)
    expect(estimatePrintHoursLayerStack({ positions: null, settings })).toBe(0)
  })

  it('is shape-aware: a tall tower outlasts a flat slab of equal volume', () => {
    // Same 8000 mm³ volume; the volume-only heuristic cannot tell them apart.
    const slab = boxPositions(40, 40, 5)
    const tower = boxPositions(10, 10, 80)
    const slabHours = estimatePrintHoursLayerStack({ positions: slab, settings })
    const towerHours = estimatePrintHoursLayerStack({ positions: tower, settings })
    expect(towerHours).toBeGreaterThan(slabHours)

    // Regression: document the volume heuristic's blind spot this fixes.
    const mkMetrics = (l, w, h) => ({
      volumeCm3: 8,
      dimensionsCm: { length: l, width: w, height: h },
      ...settings,
    })
    const heuristicSlab = estimatePrintHours(mkMetrics(4, 4, 0.5))
    const heuristicTower = estimatePrintHours(mkMetrics(1, 1, 8))
    expect(Math.abs(heuristicTower - heuristicSlab)).toBeLessThan(
      towerHours - slabHours,
    )
  })

  it('thinner layers take longer', () => {
    const positions = boxPositions(20, 20, 20)
    const fine = estimatePrintHoursLayerStack({
      positions,
      settings: { ...settings, layerHeightMm: 0.1 },
    })
    const coarse = estimatePrintHoursLayerStack({
      positions,
      settings: { ...settings, layerHeightMm: 0.3 },
    })
    expect(fine).toBeGreaterThan(coarse)
  })

  it('more infill takes longer', () => {
    const positions = boxPositions(20, 20, 20)
    const dense = estimatePrintHoursLayerStack({
      positions,
      settings: { ...settings, infillPercent: 80 },
    })
    const sparse = estimatePrintHoursLayerStack({
      positions,
      settings: { ...settings, infillPercent: 10 },
    })
    expect(dense).toBeGreaterThan(sparse)
  })

  it('support adds time', () => {
    const positions = boxPositions(20, 20, 20)
    const withSupport = estimatePrintHoursLayerStack({
      positions,
      settings: { ...settings, enableSupport: true },
    })
    const without = estimatePrintHoursLayerStack({ positions, settings })
    expect(withSupport).toBeGreaterThan(without)
  })

  it('converts source units (same cube in cm vs mm gives the same hours)', () => {
    const mm = estimatePrintHoursLayerStack({ positions: boxPositions(20, 20, 20), settings })
    const cm = estimatePrintHoursLayerStack({
      positions: boxPositions(2, 2, 2),
      sourceUnit: 'cm',
      settings,
    })
    expect(cm).toBeCloseTo(mm, 1)
  })

  it('stays bounded on a large model (layer/grid caps hold)', () => {
    const hours = estimatePrintHoursLayerStack({
      positions: boxPositions(300, 300, 300),
      settings,
    })
    expect(Number.isFinite(hours)).toBe(true)
    expect(hours).toBeGreaterThan(0)
  })
})
