import { describe, it, expect } from 'vitest'
import { customPrintDisplayPrice } from '@/lib/customPrintDisplayPrice'

describe('customPrintDisplayPrice', () => {
  it('uses quote.total for instant-quoted requests', () => {
    const r = { quoteMode: 'instant', quote: { total: 12.45 }, basePrice: 5, printFee: 3 }
    expect(customPrintDisplayPrice(r)).toEqual({
      amount: 12.45,
      label: 'Instant Quote',
      source: 'instant',
    })
  })

  it('falls back to basePrice + printFee for manual quotes', () => {
    const r = { quoteMode: 'manual', basePrice: 5, printFee: 7 }
    expect(customPrintDisplayPrice(r)).toEqual({
      amount: 12,
      label: 'Quoted',
      source: 'manual',
    })
  })

  it('treats a missing quoteMode (legacy) as manual', () => {
    const r = { basePrice: 4, printFee: 6 }
    expect(customPrintDisplayPrice(r)).toEqual({
      amount: 10,
      label: 'Quoted',
      source: 'manual',
    })
  })

  it('falls back to manual when an instant request has no finite total', () => {
    const r = { quoteMode: 'instant', quote: { total: NaN }, basePrice: 5, printFee: 2 }
    expect(customPrintDisplayPrice(r)).toEqual({
      amount: 7,
      label: 'Quoted',
      source: 'manual',
    })
  })

  it('returns 0 when both prices are missing', () => {
    expect(customPrintDisplayPrice({})).toEqual({
      amount: 0,
      label: 'Quoted',
      source: 'manual',
    })
    expect(customPrintDisplayPrice(null)).toEqual({
      amount: 0,
      label: 'Quoted',
      source: 'manual',
    })
  })
})
