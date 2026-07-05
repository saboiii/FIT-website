import { describe, it, expect } from 'vitest'
import { getEffectivePercentageForRule, getDiscountedPrice } from '@/utils/discount'

describe('getEffectivePercentageForRule', () => {
  it('returns 0 for a null rule', () => {
    expect(getEffectivePercentageForRule(null, 100, 1)).toBe(0)
  })

  it('returns the base percentage when within window and above minimum', () => {
    expect(getEffectivePercentageForRule({ percentage: 10 }, 100, 1)).toBe(10)
  })

  it('returns 0 when price is below the rule minimum amount', () => {
    expect(getEffectivePercentageForRule({ percentage: 10, minimumAmount: 200 }, 100, 1)).toBe(0)
  })

  it('returns 0 outside the date window', () => {
    const future = new Date(Date.now() + 86400000).toISOString()
    const past = new Date(Date.now() - 86400000).toISOString()
    expect(getEffectivePercentageForRule({ percentage: 10, startDate: future }, 100, 1)).toBe(0)
    expect(getEffectivePercentageForRule({ percentage: 10, endDate: past }, 100, 1)).toBe(0)
  })

  it('picks the best matching tier for the quantity', () => {
    const rule = {
      percentage: 5,
      tiers: [
        { minQty: 1, maxQty: 5, percentage: 10 },
        { minQty: 6, maxQty: 100, percentage: 20 },
      ],
    }
    expect(getEffectivePercentageForRule(rule, 100, 3)).toBe(10)
    expect(getEffectivePercentageForRule(rule, 100, 10)).toBe(20)
  })
})

describe('getDiscountedPrice', () => {
  const base = { price: { presentmentAmount: 100 } }

  it('returns null when the product has no price', () => {
    expect(getDiscountedPrice({ price: {} }, 1)).toBeNull()
  })

  it('returns null when there are no applicable rules', () => {
    expect(getDiscountedPrice(base, 1)).toBeNull()
  })

  it('applies a single discount', () => {
    expect(getDiscountedPrice({ ...base, discounts: [{ percentage: 10 }] }, 1)).toBe(90)
  })

  it('stacks multiple discounts', () => {
    expect(
      getDiscountedPrice({ ...base, discounts: [{ percentage: 10 }, { percentage: 20 }] }, 1),
    ).toBe(70)
  })

  it('caps the combined discount at 100%', () => {
    expect(
      getDiscountedPrice({ ...base, discounts: [{ percentage: 80 }, { percentage: 50 }] }, 1),
    ).toBe(0)
  })

  it('falls back to the legacy single discount field', () => {
    expect(getDiscountedPrice({ ...base, discount: { percentage: 10 } }, 1)).toBe(90)
  })

  it('merges extra (event) rules passed by the caller', () => {
    expect(getDiscountedPrice(base, 1, [{ percentage: 10 }])).toBe(90)
  })
})
