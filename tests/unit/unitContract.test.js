import { describe, it, expect } from 'vitest'
import { calculatePrintCost } from '@/lib/printPricing'
import { getDeliveryTypeApplicability } from '@/utils/deliveryTypeHelpers'

/**
 * Cross-module UNIT CONTRACT.
 *
 * Persisted dimensions use weight in KILOGRAMS and length/width/height in CM
 * (see models/CustomPrintRequest.js + models/Product.js). The delivery pricing
 * tiers and factors are defined in GRAMS (models/AppSettings.js PricingTierSchema
 * / BasePricingSchema). Every consumer that takes persisted dimensions MUST
 * convert kg -> g (×1000) before using gram-denominated pricing.
 *
 * Audit (2026-05): no active mismatch exists — deliveryTypeHelpers and
 * printPricing both convert correctly. These tests lock that invariant so a
 * future refactor cannot silently introduce a 1000× error.
 */
describe('dimension unit contract (kg in, grams for pricing)', () => {
  it('delivery formula treats persisted weight as kg and prices per gram', () => {
    // basePrice 5 + volume(1000cm3)*0.001 + weightGrams(500)*0.01 = 5 + 1 + 5 = 11
    const result = getDeliveryTypeApplicability(
      {
        name: 'standard',
        applicableToProductTypes: ['print'],
        basePricing: { basePrice: 5, volumeFactor: 0.001, weightFactor: 0.01 },
      },
      { productType: 'print', dimensions: { length: 10, width: 10, height: 10, weight: 0.5 } },
    )
    expect(result.defaultPrice).toBe(11)
  })

  it('print cost treats persisted weight as kg', () => {
    // 0.5 kg -> 500 g material baseline; explicit weight path used
    const formula = {
      baseFee: 0,
      materialCostPerGram: 0.01,
      supportMultiplier: 1,
      highQualityMultiplier: 1,
      markupPercentage: 0,
    }
    // usage = 500g * (0.3 + 0.7*0.2) = 500 * 0.44 = 220g; cost = 220 * 0.01 = 2.20
    const cost = calculatePrintCost({ sparseInfillDensity: 20 }, { weight: 0.5 }, formula)
    expect(cost).toBe(2.2)
  })

  it('a 500 g part (0.5 kg) is NOT mistakenly treated as 0.5 g', () => {
    // If weight were treated as grams, the formula price would collapse to base+volume only.
    const asKg = getDeliveryTypeApplicability(
      { name: 'standard', applicableToProductTypes: ['print'], basePricing: { basePrice: 0, volumeFactor: 0, weightFactor: 0.01 } },
      { productType: 'print', dimensions: { length: 10, width: 10, height: 10, weight: 0.5 } },
    )
    expect(asKg.defaultPrice).toBe(5) // 500 g * 0.01, not 0.5 * 0.01 = 0.005
  })
})
