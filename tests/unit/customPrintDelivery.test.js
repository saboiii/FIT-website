import { describe, it, expect } from 'vitest'
import { resolveCustomPrintDeliveryDefaults } from '@/lib/customPrintDelivery'

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
