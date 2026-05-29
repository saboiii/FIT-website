import { describe, it, expect } from 'vitest'
import { validateDimensions } from '@/lib/validation/dimensions'

describe('validateDimensions', () => {
  it('accepts undefined/null (nothing to validate)', () => {
    expect(validateDimensions(undefined).ok).toBe(true)
    expect(validateDimensions(null).ok).toBe(true)
  })

  it('accepts valid finite non-negative dimensions and coerces numbers', () => {
    const r = validateDimensions({ length: '10', width: 5, height: 2, weight: 0.25 })
    expect(r.ok).toBe(true)
    expect(r.value).toEqual({ length: 10, width: 5, height: 2, weight: 0.25 })
  })

  it('ignores blank fields', () => {
    const r = validateDimensions({ length: '', weight: 0.5 })
    expect(r.ok).toBe(true)
    expect(r.value).toEqual({ weight: 0.5 })
  })

  it('rejects negative values', () => {
    expect(validateDimensions({ weight: -1 }).ok).toBe(false)
  })

  it('rejects non-finite values', () => {
    expect(validateDimensions({ length: 'abc' }).ok).toBe(false)
    expect(validateDimensions({ height: Infinity }).ok).toBe(false)
  })

  it('rejects a non-object', () => {
    expect(validateDimensions([1, 2, 3]).ok).toBe(false)
    expect(validateDimensions('10x10x10').ok).toBe(false)
  })
})
