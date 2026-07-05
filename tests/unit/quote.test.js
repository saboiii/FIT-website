import { describe, it, expect } from 'vitest'
import { calculateInstantQuote, computeExpedite } from '@/lib/quoting/quote'

const metrics = {
  volumeCm3: 100,
  dimensionsCm: { length: 5, width: 5, height: 5 },
  confidence: 'high',
}
const settings = { materialType: 'pla', infillPercent: 20, wallLoops: 2, layerHeightMm: 0.2 }

const deliveryTier = {
  name: 'standard',
  pricingTiers: [{ minVolume: 0, maxVolume: 100000, minWeight: 0, maxWeight: 100000, price: 7 }],
}

const fullPricing = {
  materialRatePerGram: 0.02,
  printTimeRatePerHour: 3,
  baseFee: 5,
  postProcessingFee: 3,
  specialRequestFee: 4,
  priorityFee: 6,
  minimumPrice: 0,
}

describe('calculateInstantQuote — seven cost factors', () => {
  it('includes a line for each of the seven factors and subtotal equals their sum', () => {
    const q = calculateInstantQuote({
      metrics,
      settings,
      pricingOverrides: fullPricing,
      options: { postProcessing: true, specialRequest: true, priority: true },
      deliveryType: deliveryTier,
    })
    expect(q.lines.map((l) => l.key)).toEqual([
      'material', 'printTime', 'baseFee', 'postProcessing', 'specialRequest', 'priority', 'delivery',
    ])
    q.lines.forEach((l) => expect(l.amount).toBeGreaterThanOrEqual(0))
    const sum = q.lines.reduce((s, l) => s + l.amount, 0)
    expect(q.subtotal).toBeCloseTo(sum, 2)
    // deterministic fee + delivery lines
    expect(q.lines.find((l) => l.key === 'baseFee').amount).toBe(5)
    expect(q.lines.find((l) => l.key === 'postProcessing').amount).toBe(3)
    expect(q.lines.find((l) => l.key === 'specialRequest').amount).toBe(4)
    expect(q.lines.find((l) => l.key === 'priority').amount).toBe(6)
    expect(q.lines.find((l) => l.key === 'delivery').amount).toBe(7)
    expect(q.lines.find((l) => l.key === 'material').amount).toBeGreaterThan(0)
    expect(q.lines.find((l) => l.key === 'printTime').amount).toBeGreaterThan(0)
  })

  it('excludes optional fees when their options are off', () => {
    const q = calculateInstantQuote({
      metrics,
      settings,
      pricingOverrides: fullPricing,
      options: {},
    })
    expect(q.lines.find((l) => l.key === 'postProcessing').amount).toBe(0)
    expect(q.lines.find((l) => l.key === 'specialRequest').amount).toBe(0)
    expect(q.lines.find((l) => l.key === 'priority').amount).toBe(0)
    expect(q.lines.find((l) => l.key === 'delivery').amount).toBe(0) // no deliveryType
  })

  it('price rises when infill increases', () => {
    const lo = calculateInstantQuote({ metrics, settings: { ...settings, infillPercent: 20 }, pricingOverrides: fullPricing })
    const hi = calculateInstantQuote({ metrics, settings: { ...settings, infillPercent: 90 }, pricingOverrides: fullPricing })
    expect(hi.total).toBeGreaterThan(lo.total)
  })

  it('propagates low geometry confidence', () => {
    const q = calculateInstantQuote({ metrics: { ...metrics, confidence: 'low' }, settings, pricingOverrides: fullPricing })
    expect(q.confidence).toBe('low')
  })

  it('labels print time as an estimate', () => {
    const q = calculateInstantQuote({ metrics, settings, pricingOverrides: fullPricing })
    expect(q.estimatedFields).toContain('printTime')
  })
})

describe('computeExpedite', () => {
  it('applies a percentage', () => {
    expect(computeExpedite(100, { expediteMode: 'percent', expediteSurchargePercent: 50, expediteSurchargeFlat: 20 })).toBe(50)
  })
  it('applies a flat amount', () => {
    expect(computeExpedite(100, { expediteMode: 'flat', expediteSurchargePercent: 50, expediteSurchargeFlat: 20 })).toBe(20)
  })
  it('takes the greater of percent and flat', () => {
    expect(computeExpedite(30, { expediteMode: 'greater', expediteSurchargePercent: 50, expediteSurchargeFlat: 20 })).toBe(20)
    expect(computeExpedite(100, { expediteMode: 'greater', expediteSurchargePercent: 50, expediteSurchargeFlat: 20 })).toBe(50)
  })
})

describe('calculateInstantQuote — expedite and minimum price', () => {
  it('adds the expedite surcharge to the total when enabled', () => {
    const q = calculateInstantQuote({
      metrics,
      settings,
      pricingOverrides: { ...fullPricing, expediteMode: 'percent', expediteSurchargePercent: 50 },
      options: { expedite: true },
    })
    expect(q.expedite.applied).toBe(true)
    expect(q.expedite.amount).toBeCloseTo(q.subtotal * 0.5, 2)
    expect(q.total).toBeCloseTo(q.subtotal + q.expedite.amount, 2)
  })

  it('has no expedite amount when disabled', () => {
    const q = calculateInstantQuote({ metrics, settings, pricingOverrides: fullPricing, options: {} })
    expect(q.expedite.amount).toBe(0)
    expect(q.total).toBeCloseTo(q.subtotal, 2)
  })

  it('enforces the minimum price floor', () => {
    const q = calculateInstantQuote({
      metrics: { volumeCm3: 1, dimensionsCm: { length: 1, width: 1, height: 1 }, confidence: 'high' },
      settings,
      pricingOverrides: { materialRatePerGram: 0.001, printTimeRatePerHour: 0, baseFee: 0, minimumPrice: 5 },
    })
    expect(q.total).toBe(5)
    expect(q.minimumApplied).toBe(true)
  })
})
