import { describe, it, expect } from 'vitest'
import { estimatePrintHours } from '@/lib/quoting/printTimeEstimate'

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
