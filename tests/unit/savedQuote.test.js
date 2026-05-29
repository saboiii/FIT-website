import { describe, it, expect } from 'vitest'
import {
  generateShareToken,
  computeExpiry,
  isExpired,
  isQuoteValid,
  isShareUsable,
} from '@/lib/quoting/savedQuote'

describe('generateShareToken', () => {
  it('produces a non-empty URL-safe token', () => {
    const t = generateShareToken()
    expect(t.length).toBeGreaterThan(20)
    expect(t).toMatch(/^[A-Za-z0-9_-]+$/)
  })
  it('produces unique tokens', () => {
    expect(generateShareToken()).not.toBe(generateShareToken())
  })
})

describe('computeExpiry / isExpired', () => {
  const now = new Date('2026-05-29T00:00:00Z').getTime()

  it('computes a future expiry', () => {
    const exp = computeExpiry(now, 30)
    expect(exp.getTime()).toBe(now + 30 * 86400000)
  })

  it('detects expired vs valid windows', () => {
    const future = computeExpiry(now, 10)
    const past = computeExpiry(now, -10)
    expect(isExpired(future, now)).toBe(false)
    expect(isExpired(past, now)).toBe(true)
  })

  it('treats missing expiry as not expired', () => {
    expect(isExpired(null, now)).toBe(false)
  })
})

describe('isQuoteValid / isShareUsable', () => {
  const now = new Date('2026-05-29T00:00:00Z').getTime()

  it('quote is valid within its window, invalid after', () => {
    expect(isQuoteValid({ validUntil: computeExpiry(now, 5) }, now)).toBe(true)
    expect(isQuoteValid({ validUntil: computeExpiry(now, -1) }, now)).toBe(false)
    expect(isQuoteValid(null, now)).toBe(false)
  })

  it('share usable only with a token and unexpired window', () => {
    expect(isShareUsable({ shareToken: 'abc', shareExpiresAt: computeExpiry(now, 5) }, now)).toBe(true)
    expect(isShareUsable({ shareToken: 'abc', shareExpiresAt: computeExpiry(now, -5) }, now)).toBe(false)
    expect(isShareUsable({ shareExpiresAt: computeExpiry(now, 5) }, now)).toBe(false) // no token
  })
})
