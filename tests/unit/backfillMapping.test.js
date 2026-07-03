import { describe, it, expect } from 'vitest'
import { printOrderToCustomPrintRequestFields } from '@/lib/customPrint/backfillMapping'

const user = { userId: 'clerk_1', userEmail: 'a@b.com', userName: 'Ada' }

describe('printOrderToCustomPrintRequestFields', () => {
  it('maps a product PrintOrder to a product-sourced request', () => {
    const po = {
      _id: 'po1', orderId: 'PO_1', productId: 'prod1', productTitle: 'Benchy',
      totalAmount: 17, currency: 'SGD', modelUrl: 'viewables/x.glb',
      status: 'configured', isCustomUpload: false, createdAt: new Date('2026-01-01'),
    }
    const out = printOrderToCustomPrintRequestFields(po, user)
    expect(out.source).toBe('product')
    expect(out.sourceProduct).toEqual({ productId: 'prod1' })
    expect(out.userId).toBe('clerk_1')
    expect(out.modelFile.s3Key).toBe('viewables/x.glb')
    expect(out.basePrice).toBe(17)
    expect(out.currency).toBe('sgd')
    expect(out.status).toBe('configured')
    expect(out.paidAt).toEqual(new Date('2026-01-01'))
    expect(out.requestId).toMatch(/[0-9a-f-]{36}/)
  })

  it('maps an upload PrintOrder to an upload-sourced request (no productRef)', () => {
    const out = printOrderToCustomPrintRequestFields(
      { _id: 'po2', isCustomUpload: true, totalAmount: 50, status: 'paid' },
      user,
    )
    expect(out.source).toBe('upload')
    expect(out.sourceProduct).toBeUndefined()
    expect(out.modelFile).toBeUndefined()
  })

  it('falls back gracefully on missing fields', () => {
    const out = printOrderToCustomPrintRequestFields({}, {})
    expect(out.userEmail).toBe('unknown@migrated.local')
    expect(out.basePrice).toBe(0)
    expect(out.status).toBe('paid')
  })
})
