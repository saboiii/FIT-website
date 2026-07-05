import { describe, it, expect } from 'vitest'
import {
  calculateDeliveryPrice,
  isDeliveryTypeApplicable,
  getApplicableDeliveryTypes,
} from '@/utils/deliveryPriceCalculator'

const tieredType = {
  name: 'standard',
  isActive: true,
  applicableToProductTypes: ['print'],
  pricingTiers: [{ minVolume: 0, maxVolume: 1000, minWeight: 0, maxWeight: 500, price: 5 }],
}

describe('calculateDeliveryPrice', () => {
  it('is not applicable when there are no pricing tiers', () => {
    const result = calculateDeliveryPrice({ name: 'x' }, { length: 1, width: 1, height: 1, weight: 1 })
    expect(result).toEqual({ applicable: false, price: null, tierMatched: null })
  })

  it('matches a tier by volume and weight', () => {
    // 10*10*5 = 500 cm3, 100 g -> within 0-1000 / 0-500
    const result = calculateDeliveryPrice(tieredType, { length: 10, width: 10, height: 5, weight: 100 })
    expect(result.applicable).toBe(true)
    expect(result.price).toBe(5)
  })

  it('is not applicable when dimensions exceed every tier', () => {
    const result = calculateDeliveryPrice(tieredType, { length: 20, width: 10, height: 10, weight: 100 })
    expect(result.applicable).toBe(false)
    expect(result.price).toBeNull()
  })
})

describe('isDeliveryTypeApplicable', () => {
  it('checks the product type membership', () => {
    expect(isDeliveryTypeApplicable(tieredType, 'print')).toBe(true)
    expect(isDeliveryTypeApplicable(tieredType, 'shop')).toBe(false)
  })

  it('returns false when applicableToProductTypes is missing', () => {
    expect(isDeliveryTypeApplicable({ name: 'x' }, 'print')).toBe(false)
  })
})

describe('getApplicableDeliveryTypes', () => {
  it('returns active, applicable types with their price calculation', () => {
    const result = getApplicableDeliveryTypes([tieredType], 'print', {
      length: 10, width: 10, height: 5, weight: 100,
    })
    expect(result).toHaveLength(1)
    expect(result[0].priceCalculation.price).toBe(5)
  })

  it('filters out inactive types', () => {
    const inactive = { ...tieredType, isActive: false }
    const result = getApplicableDeliveryTypes([inactive], 'print', {
      length: 10, width: 10, height: 5, weight: 100,
    })
    expect(result).toHaveLength(0)
  })
})
