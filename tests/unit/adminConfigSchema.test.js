import { describe, it, expect } from 'vitest'
import { buildQuotingUpdate } from '@/lib/quoting/adminConfigSchema'

describe('buildQuotingUpdate', () => {
  it('accepts a valid quotingConfig', () => {
    const r = buildQuotingUpdate({
      quotingConfig: {
        materialRatePerGram: 0.02,
        printTimeRatePerHour: 3,
        baseFee: 1,
        expediteMode: 'greater',
        expediteSurchargePercent: 50,
        expediteSurchargeFlat: 20,
        minimumPrice: 5,
      },
    })
    expect(r.ok).toBe(true)
    expect(r.data.quotingConfig.materialRatePerGram).toBe(0.02)
  })

  it('accepts a valid printColours catalogue', () => {
    const r = buildQuotingUpdate({
      printColours: [
        { name: 'White', hex: '#ffffff' },
        { name: 'Wood Colour', hex: '#9b6a3f', material: 'wood' },
      ],
    })
    expect(r.ok).toBe(true)
    expect(r.data.printColours).toHaveLength(2)
  })

  it('rejects negative fees', () => {
    expect(buildQuotingUpdate({ quotingConfig: { baseFee: -1 } }).ok).toBe(false)
  })

  it('rejects an invalid expedite mode', () => {
    expect(buildQuotingUpdate({ quotingConfig: { expediteMode: 'sometimes' } }).ok).toBe(false)
  })

  it('rejects a malformed hex colour', () => {
    expect(buildQuotingUpdate({ printColours: [{ name: 'X', hex: 'red' }] }).ok).toBe(false)
  })

  it('rejects unknown fields (strict)', () => {
    expect(buildQuotingUpdate({ quotingConfig: { secretMarkup: 5 } }).ok).toBe(false)
    expect(buildQuotingUpdate({ bogus: true }).ok).toBe(false)
  })

  it('rejects an empty update', () => {
    expect(buildQuotingUpdate({}).ok).toBe(false)
  })
})
