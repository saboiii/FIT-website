import { describe, it, expect } from 'vitest'
import { calculatePrintCost } from '@/lib/printPricing'

const formula = {
  baseFee: 5,
  materialCostPerGram: 0.05,
  supportMultiplier: 1.2,
  highQualityMultiplier: 1.5,
  markupPercentage: 30,
}

describe('calculatePrintCost', () => {
  it('returns 0 when no formula is provided', () => {
    expect(calculatePrintCost({}, {}, null)).toBe(0)
    expect(calculatePrintCost({}, {}, undefined)).toBe(0)
  })

  it('prices from explicit weight, infill, base fee and markup', () => {
    // weight 0.1kg -> 100g; infill 20% -> usage 100*(0.3+0.7*0.2)=44g
    // cost = (5 + 44*0.05) * 1.3 = 7.2 * 1.3 = 9.36
    const cost = calculatePrintCost(
      { sparseInfillDensity: 20, layerHeight: 0.2, enableSupport: false },
      { weight: 0.1 },
      formula,
    )
    expect(cost).toBe(9.36)
  })

  it('applies high-quality and support multipliers', () => {
    // 7.2 * 1.5 (hq, layer<0.15) * 1.2 (support) * 1.3 (markup) = 16.85
    const cost = calculatePrintCost(
      { sparseInfillDensity: 20, layerHeight: 0.1, enableSupport: true },
      { weight: 0.1 },
      formula,
    )
    expect(cost).toBe(16.85)
  })

  it('estimates weight from volume when weight is absent (PLA density)', () => {
    // 10*10*10=1000cm3 -> 1200g; infill default 20% -> usage 528g
    // cost = (5 + 528*0.05) * 1.3 = 31.4 * 1.3 = 40.82
    const cost = calculatePrintCost(
      { sparseInfillDensity: 20 },
      { length: 10, width: 10, height: 10 },
      formula,
    )
    expect(cost).toBe(40.82)
  })

  it('uses formula and dimension defaults when fields are omitted', () => {
    // defaults: base 5, 0.05/g, markup 30, dims 10x10x10, infill 20
    expect(calculatePrintCost({}, {}, {})).toBe(40.82)
  })

  it('higher infill yields a higher cost', () => {
    const low = calculatePrintCost({ sparseInfillDensity: 10 }, { weight: 0.2 }, formula)
    const high = calculatePrintCost({ sparseInfillDensity: 80 }, { weight: 0.2 }, formula)
    expect(high).toBeGreaterThan(low)
  })
})
