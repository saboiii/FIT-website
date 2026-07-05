import { describe, it, expect } from 'vitest'
import { buildSetupChecklist, needsOnboarding, summarizeRequests } from '@/lib/admin/setupChecklist'
import { DEFAULT_TIME_MODEL } from '@/lib/quoting/pricingDefaults'

const completeInput = {
  quotingConfig: {
    materialRatePerGram: 0.02,
    printTimeRatePerHour: 3,
    timeModel: { ...DEFAULT_TIME_MODEL, baseFlowCm3PerHour: 10 },
  },
  printColours: [{ name: 'Black', hex: '#111111' }],
  machineLimits: { maxLengthCm: 30, maxWidthCm: null, maxHeightCm: null, maxWeightKg: null },
  deliveryTypes: [
    { name: 'courier', applicableToProductTypes: ['print'], isActive: true, pricingTiers: [{ minWeight: 0 }] },
  ],
  customPrintProduct: {
    basePrice: { presentmentAmount: 10 },
    dimensions: { length: 10, width: 10, height: 10, weight: 0.5 },
  },
  adminEmailPresent: true,
}

describe('buildSetupChecklist', () => {
  it('marks everything ok on a fully configured store', () => {
    const items = buildSetupChecklist(completeInput)
    expect(items).toHaveLength(7)
    expect(items.every((i) => i.ok)).toBe(true)
    // every row carries UI affordances
    for (const i of items) {
      expect(i.key).toBeTruthy()
      expect(i.label).toBeTruthy()
      expect(i.consequence).toBeTruthy()
      expect(i.tab).toBeTruthy()
    }
  })

  it('flags zero pricing rates', () => {
    const items = buildSetupChecklist({
      ...completeInput,
      quotingConfig: { ...completeInput.quotingConfig, materialRatePerGram: 0 },
    })
    expect(items.find((i) => i.key === 'pricing').ok).toBe(false)
  })

  it('flags an untuned time model (all defaults)', () => {
    const items = buildSetupChecklist({
      ...completeInput,
      quotingConfig: { ...completeInput.quotingConfig, timeModel: { ...DEFAULT_TIME_MODEL } },
    })
    expect(items.find((i) => i.key === 'timeModel').ok).toBe(false)
  })

  it('flags missing machine limits, colours and admin email', () => {
    const items = buildSetupChecklist({
      ...completeInput,
      machineLimits: {},
      printColours: [],
      adminEmailPresent: false,
    })
    expect(items.find((i) => i.key === 'machineLimits').ok).toBe(false)
    expect(items.find((i) => i.key === 'colours').ok).toBe(false)
    expect(items.find((i) => i.key === 'adminEmail').ok).toBe(false)
  })

  it('requires an active print delivery type with pricing', () => {
    const inactive = buildSetupChecklist({
      ...completeInput,
      deliveryTypes: [{ name: 'courier', applicableToProductTypes: ['print'], isActive: false, pricingTiers: [{}] }],
    })
    expect(inactive.find((i) => i.key === 'delivery').ok).toBe(false)

    const shopOnly = buildSetupChecklist({
      ...completeInput,
      deliveryTypes: [{ name: 'digital', applicableToProductTypes: ['shop'], isActive: true, pricingTiers: [{}] }],
    })
    expect(shopOnly.find((i) => i.key === 'delivery').ok).toBe(false)

    const formula = buildSetupChecklist({
      ...completeInput,
      deliveryTypes: [{ name: 'courier', applicableToProductTypes: ['print'], isActive: true, basePricing: { basePrice: 5 } }],
    })
    expect(formula.find((i) => i.key === 'delivery').ok).toBe(true)
  })

  it('requires the custom-print base product to have a price and dimensions', () => {
    const noPrice = buildSetupChecklist({ ...completeInput, customPrintProduct: null })
    expect(noPrice.find((i) => i.key === 'product').ok).toBe(false)

    const noDims = buildSetupChecklist({
      ...completeInput,
      customPrintProduct: { basePrice: { presentmentAmount: 10 }, dimensions: { length: '', width: '', height: '', weight: '' } },
    })
    expect(noDims.find((i) => i.key === 'product').ok).toBe(false)
  })

  it('tolerates missing input entirely', () => {
    const items = buildSetupChecklist({})
    expect(items).toHaveLength(7)
    expect(items.some((i) => i.ok)).toBe(false)
  })
})

describe('needsOnboarding', () => {
  it('is false when the required items (pricing, delivery, product) pass', () => {
    expect(needsOnboarding(buildSetupChecklist(completeInput))).toBe(false)
  })
  it('is true when any required item fails', () => {
    const items = buildSetupChecklist({ ...completeInput, deliveryTypes: [] })
    expect(needsOnboarding(items)).toBe(true)
  })
  it('ignores optional items (time model, limits, colours, email)', () => {
    const items = buildSetupChecklist({
      ...completeInput,
      printColours: [],
      machineLimits: {},
      adminEmailPresent: false,
      quotingConfig: { ...completeInput.quotingConfig, timeModel: { ...DEFAULT_TIME_MODEL } },
    })
    expect(needsOnboarding(items)).toBe(false)
  })
})

describe('summarizeRequests', () => {
  const requests = [
    { status: 'configured', quotedAt: null },
    { status: 'configured', quotedAt: '2026-01-01' },
    { status: 'quoted' },
    { status: 'paid' },
    { status: 'paid' },
    { status: 'printing' },
    { status: 'delivered' },
    { status: 'cancelled' },
  ]

  it('counts open requests by status, excluding delivered/cancelled', () => {
    const s = summarizeRequests(requests)
    expect(s.openTotal).toBe(6)
    expect(s.openByStatus.configured).toBe(2)
    expect(s.openByStatus.paid).toBe(2)
    expect(s.openByStatus.delivered).toBeUndefined()
  })

  it('counts unquoted submissions and paid-not-yet-printed', () => {
    const s = summarizeRequests(requests)
    expect(s.unquoted).toBe(1)
    expect(s.paidNotPrinted).toBe(2)
  })

  it('handles empty/missing input', () => {
    expect(summarizeRequests()).toEqual({ openTotal: 0, openByStatus: {}, unquoted: 0, paidNotPrinted: 0 })
  })
})
