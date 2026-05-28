import { describe, it, expect } from 'vitest'
import { estimateMaterialGrams, effectiveFillFraction } from '@/lib/quoting/materialEstimate'

const dims = { length: 5, width: 5, height: 5 } // cm, bbox 125 cm³

describe('estimateMaterialGrams', () => {
  it('increases monotonically with infill', () => {
    const low = estimateMaterialGrams({ volumeCm3: 125, dimensionsCm: dims, infillPercent: 20, densityGPerCm3: 1.24 })
    const high = estimateMaterialGrams({ volumeCm3: 125, dimensionsCm: dims, infillPercent: 80, densityGPerCm3: 1.24 })
    expect(high).toBeGreaterThan(low)
  })

  it('never exceeds the solid weight (volume × density)', () => {
    const solid = 125 * 1.24
    const g = estimateMaterialGrams({ volumeCm3: 125, dimensionsCm: dims, infillPercent: 80, densityGPerCm3: 1.24 })
    expect(g).toBeLessThanOrEqual(solid)
  })

  it('approaches solid weight at 100% infill', () => {
    const g = estimateMaterialGrams({ volumeCm3: 125, dimensionsCm: dims, infillPercent: 100, densityGPerCm3: 1.24 })
    expect(g).toBeCloseTo(125 * 1.24, 6)
  })

  it('is heavier for a denser material', () => {
    const light = estimateMaterialGrams({ volumeCm3: 125, dimensionsCm: dims, infillPercent: 50, densityGPerCm3: 1.0 })
    const heavy = estimateMaterialGrams({ volumeCm3: 125, dimensionsCm: dims, infillPercent: 50, densityGPerCm3: 2.0 })
    expect(heavy).toBeGreaterThan(light)
  })

  it('returns 0 for empty geometry', () => {
    expect(estimateMaterialGrams({ volumeCm3: 0, dimensionsCm: dims })).toBe(0)
  })
})

describe('effectiveFillFraction', () => {
  it('stays within (0, 1]', () => {
    const f = effectiveFillFraction({ dimensionsCm: dims, infillPercent: 20 })
    expect(f).toBeGreaterThan(0)
    expect(f).toBeLessThanOrEqual(1)
  })
})
