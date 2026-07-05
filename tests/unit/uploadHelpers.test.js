import { describe, it, expect } from 'vitest'
import { progressPercent } from '@/utils/uploadHelpers'

describe('progressPercent', () => {
  it('returns 0 for unknown or zero total', () => {
    expect(progressPercent(10, 0)).toBe(0)
    expect(progressPercent(10, undefined)).toBe(0)
    expect(progressPercent(10, null)).toBe(0)
  })

  it('computes a rounded percentage', () => {
    expect(progressPercent(50, 100)).toBe(50)
    expect(progressPercent(1, 3)).toBe(33)
    expect(progressPercent(2, 3)).toBe(67)
  })

  it('clamps to the 0..100 range', () => {
    expect(progressPercent(-5, 100)).toBe(0)
    expect(progressPercent(150, 100)).toBe(100)
  })
})
