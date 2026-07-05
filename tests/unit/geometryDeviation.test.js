import { describe, it, expect } from 'vitest'
import { geometryDeviation, DEFAULT_DEVIATION_TOLERANCE_PCT } from '@/lib/quoting/geometryDeviation'

describe('geometryDeviation', () => {
  it('returns null delta when either side is missing', () => {
    expect(geometryDeviation(null, { volumeCm3: 10 })).toEqual({
      volumePctDelta: null,
      suspicious: false,
      tolerancePct: DEFAULT_DEVIATION_TOLERANCE_PCT,
    })
    expect(geometryDeviation({ volumeCm3: 10 }, null)).toEqual({
      volumePctDelta: null,
      suspicious: false,
      tolerancePct: DEFAULT_DEVIATION_TOLERANCE_PCT,
    })
  })

  it('returns null delta when server volume is non-positive (cannot compare)', () => {
    const d = geometryDeviation({ volumeCm3: 10 }, { volumeCm3: 0 })
    expect(d.volumePctDelta).toBeNull()
    expect(d.suspicious).toBe(false)
  })

  it('flags identical client+server as not suspicious', () => {
    const d = geometryDeviation({ volumeCm3: 24.8 }, { volumeCm3: 24.8 })
    expect(d.volumePctDelta).toBe(0)
    expect(d.suspicious).toBe(false)
  })

  it('flags a 50% lowball as suspicious at the default tolerance', () => {
    const d = geometryDeviation({ volumeCm3: 12 }, { volumeCm3: 24 })
    expect(d.volumePctDelta).toBe(50)
    expect(d.suspicious).toBe(true)
  })

  it('stays under the threshold for a small honest mismatch', () => {
    // 5% relative delta — within the default 10% tolerance.
    const d = geometryDeviation({ volumeCm3: 95 }, { volumeCm3: 100 })
    expect(d.volumePctDelta).toBe(5)
    expect(d.suspicious).toBe(false)
  })

  it('respects a custom tolerance', () => {
    // Same 5% delta — strict tolerance 1% flips suspicious to true.
    const d = geometryDeviation({ volumeCm3: 95 }, { volumeCm3: 100 }, 1)
    expect(d.suspicious).toBe(true)
    expect(d.tolerancePct).toBe(1)
  })
})
