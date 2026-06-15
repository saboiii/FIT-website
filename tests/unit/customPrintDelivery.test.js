import { describe, it, expect } from 'vitest'
import { resolveCustomPrintDeliveryDefaults } from '@/lib/customPrintDelivery'

// Product delivery-type shape (Product.DeliveryTypeSchema): the admin curates
// these on the custom-print product with their prices already set.
const make = (overrides = {}) => ({
  type: 'standard',
  price: 5,
  customPrice: null,
  customDescription: null,
  ...overrides,
})

describe('resolveCustomPrintDeliveryDefaults', () => {
  it('returns [] for missing or non-array input', () => {
    expect(resolveCustomPrintDeliveryDefaults(undefined)).toEqual([])
    expect(resolveCustomPrintDeliveryDefaults(null)).toEqual([])
    expect(resolveCustomPrintDeliveryDefaults('not-an-array')).toEqual([])
  })

  it('copies the product delivery types verbatim with their set prices', () => {
    const out = resolveCustomPrintDeliveryDefaults([
      make({ type: 'standard', price: 5 }),
      make({ type: 'express', price: 12 }),
    ])
    expect(out).toEqual([
      { type: 'standard', price: 5, customPrice: null, customDescription: null },
      { type: 'express', price: 12, customPrice: null, customDescription: null },
    ])
  })

  it('preserves an admin customPrice override and description', () => {
    const out = resolveCustomPrintDeliveryDefaults([
      make({ type: 'courier', price: 8, customPrice: 6.5, customDescription: 'Tracked' }),
    ])
    expect(out[0]).toEqual({
      type: 'courier',
      price: 8,
      customPrice: 6.5,
      customDescription: 'Tracked',
    })
  })

  it('carries deliveryTypeConfigId when present and defaults missing price to 0', () => {
    const out = resolveCustomPrintDeliveryDefaults([
      { type: 'pickup', deliveryTypeConfigId: 'cfg1' },
    ])
    expect(out[0]).toEqual({
      type: 'pickup',
      price: 0,
      customPrice: null,
      customDescription: null,
      deliveryTypeConfigId: 'cfg1',
    })
  })

  it('drops entries without a type', () => {
    const out = resolveCustomPrintDeliveryDefaults([make({ type: '' }), make({ type: 'ok' })])
    expect(out.map((d) => d.type)).toEqual(['ok'])
  })
})
