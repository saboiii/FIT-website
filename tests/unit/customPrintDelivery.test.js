import { describe, it, expect } from 'vitest'
import {
  resolveCustomPrintDeliveryDefaults,
  refreshCustomPrintDeliveryPrices,
} from '@/lib/customPrintDelivery'

const make = (overrides = {}) => ({
  _id: 'aaaa1',
  name: 'standard',
  displayName: 'Standard',
  applicableToProductTypes: ['print'],
  isActive: true,
  ...overrides,
})

describe('resolveCustomPrintDeliveryDefaults', () => {
  it('returns [] for missing or non-array input', () => {
    expect(resolveCustomPrintDeliveryDefaults(undefined)).toEqual([])
    expect(resolveCustomPrintDeliveryDefaults(null)).toEqual([])
    expect(resolveCustomPrintDeliveryDefaults('not-an-array')).toEqual([])
  })

  it('includes active print delivery types only', () => {
    const types = [
      make({ name: 'standard', applicableToProductTypes: ['print'] }),
      make({ name: 'shop-only', applicableToProductTypes: ['shop'] }),
      make({ name: 'inactive-print', isActive: false }),
      make({ name: 'both', applicableToProductTypes: ['shop', 'print'] }),
    ]
    const out = resolveCustomPrintDeliveryDefaults(types)
    expect(out.map((d) => d.type)).toEqual(['standard', 'both'])
  })

  it('maps to the request delivery-types shape', () => {
    const out = resolveCustomPrintDeliveryDefaults([make({ name: 'express', _id: 'xid' })])
    expect(out[0]).toEqual({ type: 'express', deliveryTypeConfigId: 'xid', price: 0 })
  })

  it('tolerates missing _id', () => {
    const out = resolveCustomPrintDeliveryDefaults([make({ name: 'pickup', _id: undefined })])
    expect(out[0]).toEqual({ type: 'pickup', deliveryTypeConfigId: null, price: 0 })
  })
})

// Request dims: cm + weight in kg (the CustomPrintRequest.dimensions shape)
const DIMS = { length: 10, width: 10, height: 5, weight: 0.2 } // 500 cm³, 200 g

const tiered = make({
  name: 'courier',
  pricingTiers: [
    { minVolume: 0, maxVolume: 1000, minWeight: 0, maxWeight: 500, price: 6.5 },
    { minVolume: 1000, maxVolume: 1e9, minWeight: 0, maxWeight: 1e9, price: 15 },
  ],
})
const formula = make({
  name: 'express',
  basePricing: { basePrice: 4, volumeFactor: 0.002, weightFactor: 0.005 },
})

describe('resolveCustomPrintDeliveryDefaults with dimensions', () => {
  it('prices tier-based types from the matching tier (weight kg -> g)', () => {
    const out = resolveCustomPrintDeliveryDefaults([tiered], DIMS)
    expect(out[0].price).toBe(6.5)
  })

  it('prices formula-based types (base + volume*f + grams*f)', () => {
    const out = resolveCustomPrintDeliveryDefaults([formula], DIMS)
    expect(out[0].price).toBeCloseTo(4 + 500 * 0.002 + 200 * 0.005, 5) // 6.0
  })

  it('excludes types whose tiers do not cover the dims', () => {
    const tooSmall = make({
      name: 'letterbox',
      pricingTiers: [{ minVolume: 0, maxVolume: 10, minWeight: 0, maxWeight: 50, price: 2 }],
    })
    const out = resolveCustomPrintDeliveryDefaults([tooSmall, tiered], DIMS)
    expect(out.map((d) => d.type)).toEqual(['courier'])
  })

  it('keeps unpriced types (e.g. pickup) at 0', () => {
    const out = resolveCustomPrintDeliveryDefaults([make({ name: 'pickup' })], DIMS)
    expect(out[0].price).toBe(0)
  })
})

describe('refreshCustomPrintDeliveryPrices', () => {
  it('reprices stored types from current admin settings', () => {
    const stored = [{ type: 'courier', deliveryTypeConfigId: 'aaaa1', price: 0 }]
    const out = refreshCustomPrintDeliveryPrices(stored, [tiered], DIMS)
    expect(out[0].price).toBe(6.5)
  })

  it('never overrides an admin-set customPrice', () => {
    const stored = [{ type: 'courier', deliveryTypeConfigId: 'aaaa1', price: 0, customPrice: 3 }]
    const out = refreshCustomPrintDeliveryPrices(stored, [tiered], DIMS)
    expect(out[0].customPrice).toBe(3)
    expect(out[0].price).toBe(0) // untouched; customPrice wins downstream
  })

  it('leaves types with no matching current config untouched', () => {
    const stored = [{ type: 'legacy-van', price: 9 }]
    const out = refreshCustomPrintDeliveryPrices(stored, [tiered], DIMS)
    expect(out[0].price).toBe(9)
  })
})
