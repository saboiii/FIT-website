import { describe, it, expect } from 'vitest'
import { estimatePrintHours } from '@/lib/quoting/printTimeEstimate'
import { resolveTimeModel, DEFAULT_TIME_MODEL } from '@/lib/quoting/pricingDefaults'
import { calculateInstantQuote } from '@/lib/quoting/quote'

const base = { volumeCm3: 100, dimensionsCm: { length: 5, width: 5, height: 5 } }

describe('estimatePrintHours', () => {
  it('takes longer with thinner layers', () => {
    const thin = estimatePrintHours({ ...base, layerHeightMm: 0.1 })
    const thick = estimatePrintHours({ ...base, layerHeightMm: 0.3 })
    expect(thin).toBeGreaterThan(thick)
  })

  it('takes longer with supports enabled', () => {
    const withSupport = estimatePrintHours({ ...base, enableSupport: true })
    const without = estimatePrintHours({ ...base, enableSupport: false })
    expect(withSupport).toBeGreaterThan(without)
  })

  it('takes longer for a larger model', () => {
    const big = estimatePrintHours({ ...base, volumeCm3: 200 })
    const small = estimatePrintHours({ ...base, volumeCm3: 100 })
    expect(big).toBeGreaterThan(small)
  })

  it('returns a positive estimate for a non-empty model', () => {
    expect(estimatePrintHours(base)).toBeGreaterThan(0)
  })

  it('returns 0 for empty geometry', () => {
    expect(estimatePrintHours({ volumeCm3: 0 })).toBe(0)
  })
})

describe('resolveTimeModel', () => {
  it('merges admin overrides over the defaults (known keys only)', () => {
    const m = resolveTimeModel({ baseFlowCm3PerHour: 12, bogus: 99 })
    expect(m.baseFlowCm3PerHour).toBe(12)
    expect(m.layerHeightRefMm).toBe(DEFAULT_TIME_MODEL.layerHeightRefMm)
    expect(m.bogus).toBeUndefined()
  })

  it('ignores null/undefined overrides', () => {
    expect(resolveTimeModel({ baseFlowCm3PerHour: null })).toEqual(DEFAULT_TIME_MODEL)
    expect(resolveTimeModel(undefined)).toEqual(DEFAULT_TIME_MODEL)
  })
})

describe('quote uses the admin time model', () => {
  const args = {
    metrics: { volumeCm3: 100, dimensionsCm: { length: 5, width: 5, height: 5 }, confidence: 'high' },
    settings: { layerHeightMm: 0.2 },
  }

  it('a faster configured flow rate lowers print hours and the time cost', () => {
    const slow = calculateInstantQuote({ ...args, pricingOverrides: { minimumPrice: 0 } })
    const fast = calculateInstantQuote({
      ...args,
      pricingOverrides: { minimumPrice: 0, timeModel: { baseFlowCm3PerHour: 16 } },
    })
    expect(fast.inputs.printHours).toBeLessThan(slow.inputs.printHours)
    const cost = (q) => q.lines.find((l) => l.key === 'printTime').amount
    expect(cost(fast)).toBeLessThan(cost(slow))
  })
})
