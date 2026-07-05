import { describe, it, expect } from 'vitest'
import { checkMachineLimits, machineLimitMessage } from '@/lib/quoting/machineLimits'

const LIMITS = { maxLengthCm: 30, maxWidthCm: 30, maxHeightCm: 40, maxWeightKg: 5 }

describe('checkMachineLimits', () => {
  it('fits when everything is under the limits', () => {
    const r = checkMachineLimits({ length: 10, width: 10, height: 10 }, 0.5, LIMITS)
    expect(r.fits).toBe(true)
    expect(r.violations).toEqual([])
  })

  it('flags each exceeded dimension and the weight', () => {
    const r = checkMachineLimits({ length: 35, width: 10, height: 41 }, 6, LIMITS)
    expect(r.fits).toBe(false)
    expect(r.violations.map((v) => v.field)).toEqual(['length', 'height', 'weight'])
  })

  it('enforces nothing when limits are unset/null (mechanism ships dark)', () => {
    expect(checkMachineLimits({ length: 9999, width: 9999, height: 9999 }, 999, null).fits).toBe(true)
    expect(
      checkMachineLimits({ length: 9999, width: 1, height: 1 }, 1, {
        maxLengthCm: null, maxWidthCm: null, maxHeightCm: null, maxWeightKg: null,
      }).fits,
    ).toBe(true)
  })

  it('ignores non-finite inputs rather than throwing', () => {
    expect(checkMachineLimits({ length: NaN }, undefined, LIMITS).fits).toBe(true)
    expect(checkMachineLimits(null, null, LIMITS).fits).toBe(true)
  })
})

describe('machineLimitMessage', () => {
  it('builds a customer-safe message listing each violation', () => {
    const { violations } = checkMachineLimits({ length: 35, width: 1, height: 1 }, null, LIMITS)
    const msg = machineLimitMessage(violations)
    expect(msg).toContain('length 35.0 cm exceeds our maximum of 30 cm')
    expect(msg).toContain('scale it down')
  })

  it('returns empty for no violations', () => {
    expect(machineLimitMessage([])).toBe('')
  })
})
