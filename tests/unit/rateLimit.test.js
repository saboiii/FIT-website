import { describe, it, expect, vi, afterEach } from 'vitest'
import { clientIpFrom, rateLimitHeaders, limitQuoteRequest } from '@/lib/rateLimit'

function headersOf(map) {
  return { get: (k) => map[k.toLowerCase()] ?? null }
}

describe('clientIpFrom', () => {
  it('takes the first x-forwarded-for entry', () => {
    expect(clientIpFrom(headersOf({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1' }))).toBe('1.2.3.4')
  })

  it('falls back to x-real-ip, then unknown', () => {
    expect(clientIpFrom(headersOf({ 'x-real-ip': '5.6.7.8' }))).toBe('5.6.7.8')
    expect(clientIpFrom(headersOf({}))).toBe('unknown')
  })
})

describe('rateLimitHeaders', () => {
  it('produces the standard X-RateLimit-* and Retry-After headers', () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000_000)
    const h = rateLimitHeaders({ limit: 15, remaining: 0, reset: 1_000_000 + 30_000 })
    expect(h['X-RateLimit-Limit']).toBe('15')
    expect(h['X-RateLimit-Remaining']).toBe('0')
    expect(h['Retry-After']).toBe('30')
    vi.useRealTimers()
  })

  it('clamps remaining and retry-after to sane minimums', () => {
    const h = rateLimitHeaders({ limit: 15, remaining: -1, reset: Date.now() - 5000 })
    expect(h['X-RateLimit-Remaining']).toBe('0')
    expect(h['Retry-After']).toBe('1')
  })
})

describe('limitQuoteRequest (Upstash unconfigured)', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('allows everything when Upstash env vars are unset', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')
    const out = await limitQuoteRequest({ userId: null, headers: headersOf({}) })
    expect(out.allowed).toBe(true)
    expect(out.headers).toEqual({})
  })
})
