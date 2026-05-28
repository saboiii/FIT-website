import { describe, it, expect } from 'vitest'
import { buildQuote } from '@/lib/quoting/quoteRequest'

const validInput = {
  volumeCm3: 100,
  dimensionsCm: { length: 5, width: 5, height: 5 },
  confidence: 'high',
  settings: { materialType: 'pla', infillPercent: 20, layerHeightMm: 0.2 },
  options: { expedite: false },
}

describe('buildQuote — validation', () => {
  it('accepts a valid payload and returns an itemized quote', () => {
    const r = buildQuote(validInput, { pricingConfig: { minimumPrice: 0 } })
    expect(r.ok).toBe(true)
    expect(r.status).toBe(200)
    expect(r.data.quote.lines).toHaveLength(7)
    expect(r.data.quote.total).toBeGreaterThan(0)
  })

  it('rejects unknown fields (including any client-supplied price)', () => {
    const r = buildQuote({ ...validInput, total: 1, price: 0.01 }, {})
    expect(r.ok).toBe(false)
    expect(r.status).toBe(400)
  })

  it('rejects client-supplied pricing rate fields', () => {
    const r = buildQuote({ ...validInput, materialRatePerGram: 0 }, {})
    expect(r.ok).toBe(false)
    expect(r.status).toBe(400)
  })

  it('rejects non-finite / out-of-range numbers', () => {
    expect(buildQuote({ ...validInput, volumeCm3: -5 }, {}).ok).toBe(false)
    expect(buildQuote({ ...validInput, volumeCm3: Infinity }, {}).ok).toBe(false)
  })
})

describe('buildQuote — server-authoritative pricing', () => {
  it('derives the price from server pricingConfig, not the client', () => {
    const r = buildQuote(validInput, { pricingConfig: { baseFee: 99, minimumPrice: 0 } })
    expect(r.data.quote.lines.find((l) => l.key === 'baseFee').amount).toBe(99)
  })

  it('resolves a named delivery type from server config', () => {
    const deliveryTypes = [
      { name: 'standard', pricingTiers: [{ minVolume: 0, maxVolume: 1e9, minWeight: 0, maxWeight: 1e9, price: 12 }] },
    ]
    const r = buildQuote(
      { ...validInput, deliveryTypeName: 'standard' },
      { pricingConfig: { minimumPrice: 0 }, deliveryTypes },
    )
    expect(r.data.quote.lines.find((l) => l.key === 'delivery').amount).toBe(12)
  })

  it('passes requestId through for persistence', () => {
    const r = buildQuote(
      { ...validInput, requestId: '123e4567-e89b-12d3-a456-426614174000' },
      { pricingConfig: { minimumPrice: 0 } },
    )
    expect(r.data.requestId).toBe('123e4567-e89b-12d3-a456-426614174000')
  })
})
