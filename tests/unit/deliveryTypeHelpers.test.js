import { describe, it, expect } from 'vitest'
import {
  getDeliveryTypeApplicability,
  updateCustomPrice,
  resetToDefaultPrice,
} from '@/utils/deliveryTypeHelpers'

describe('getDeliveryTypeApplicability', () => {
  it('rejects digital delivery for printed products', () => {
    const result = getDeliveryTypeApplicability(
      { name: 'digital', applicableToProductTypes: ['print', 'shop'] },
      { productType: 'print' },
    )
    expect(result.applicable).toBe(false)
  })

  it('rejects a type not applicable to the product type', () => {
    const result = getDeliveryTypeApplicability(
      { name: 'standard', applicableToProductTypes: ['shop'] },
      { productType: 'print', dimensions: { length: 1, width: 1, height: 1, weight: 1 } },
    )
    expect(result.applicable).toBe(false)
  })

  it('requires dimensions for formula-based pricing', () => {
    const result = getDeliveryTypeApplicability(
      { name: 'standard', applicableToProductTypes: ['print'], basePricing: { basePrice: 5 } },
      { productType: 'print', dimensions: {} },
    )
    expect(result.applicable).toBe(false)
    expect(result.reason).toMatch(/dimensions/i)
  })

  it('computes a formula-based price (kg converted to grams)', () => {
    // volume = 1000 cm3, weight 0.5kg -> 500g
    // price = 5 + 1000*0.001 + 500*0.01 = 5 + 1 + 5 = 11
    const result = getDeliveryTypeApplicability(
      {
        name: 'standard',
        applicableToProductTypes: ['print'],
        basePricing: { basePrice: 5, volumeFactor: 0.001, weightFactor: 0.01 },
      },
      { productType: 'print', dimensions: { length: 10, width: 10, height: 10, weight: 0.5 } },
    )
    expect(result.applicable).toBe(true)
    expect(result.formulaUsed).toBe(true)
    expect(result.defaultPrice).toBe(11)
  })

  it('clamps a formula price to the configured min/max', () => {
    const result = getDeliveryTypeApplicability(
      {
        name: 'standard',
        applicableToProductTypes: ['print'],
        basePricing: { basePrice: 5, volumeFactor: 0.001, weightFactor: 0.01, maxPrice: 8 },
      },
      { productType: 'print', dimensions: { length: 10, width: 10, height: 10, weight: 0.5 } },
    )
    expect(result.defaultPrice).toBe(8)
  })
})

describe('selected delivery type helpers', () => {
  it('updateCustomPrice sets a numeric price', () => {
    const next = updateCustomPrice({ standard: { enabled: true } }, 'standard', '12')
    expect(next.standard.customPrice).toBe(12)
  })

  it('updateCustomPrice maps empty string to null', () => {
    const next = updateCustomPrice({ standard: { enabled: true } }, 'standard', '')
    expect(next.standard.customPrice).toBeNull()
  })

  it('resetToDefaultPrice restores the default', () => {
    const next = resetToDefaultPrice(
      { standard: { enabled: true, customPrice: 99, defaultPrice: 5 } },
      'standard',
    )
    expect(next.standard.customPrice).toBe(5)
  })
})
