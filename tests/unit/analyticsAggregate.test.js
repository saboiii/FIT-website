import { describe, it, expect } from 'vitest'
import { aggregateEvents, rangeToInterval, RANGE_PRESETS } from '@/lib/analytics/aggregate'

const now = new Date('2026-07-03T12:00:00Z')

function ev({ properties, ...rest } = {}) {
  return {
    timestamp: '2026-07-03T10:00:00Z',
    distinct_id: 'user-1',
    ...rest,
    properties: {
      $session_id: 's1',
      $pathname: '/blog/hello-world',
      $referring_domain: 'google.com',
      $browser: 'Chrome',
      $device_type: 'Desktop',
      $geoip_country_name: 'Singapore',
      ...properties,
    },
  }
}

describe('rangeToInterval', () => {
  it('maps presets to since/bucket', () => {
    const day = rangeToInterval('last_24_hours', now)
    expect(day.bucket).toBe('hour')
    expect(now - day.since).toBe(24 * 3600 * 1000)
    const month = rangeToInterval('last_30_days', now)
    expect(month.bucket).toBe('day')
  })
  it('falls back to 7 days for unknown presets', () => {
    const r = rangeToInterval('bogus', now)
    expect(now - r.since).toBe(7 * 24 * 3600 * 1000)
    expect(RANGE_PRESETS).toContain('last_7_days')
  })
})

describe('aggregateEvents', () => {
  it('counts totals, sources, devices, browsers, countries', () => {
    const events = [
      ev(),
      ev({ properties: { $referring_domain: '$direct' } }),
      ev({ distinct_id: 'user-2', properties: { $browser: 'Safari', $device_type: 'Mobile', $geoip_country_name: 'Malaysia' } }),
    ]
    const snap = aggregateEvents(events, { window: 'last_24_hours', now })
    expect(snap.totalViews).toBe(3)
    expect(snap.uniqueVisitors).toBe(2)
    expect(snap.sources.find((s) => s.name === 'Direct').count).toBe(1)
    expect(snap.sources.find((s) => s.name === 'google.com').count).toBe(2)
    expect(snap.devices.find((d) => d.name === 'Mobile').count).toBe(1)
    expect(snap.browsers.find((b) => b.name === 'Safari').count).toBe(1)
    expect(snap.countries.find((c) => c.name === 'Singapore').count).toBe(2)
  })

  it('buckets a time series and hourly activity', () => {
    const events = [
      ev({ timestamp: '2026-07-03T10:05:00Z' }),
      ev({ timestamp: '2026-07-03T10:45:00Z' }),
      ev({ timestamp: '2026-07-03T11:05:00Z' }),
    ]
    const snap = aggregateEvents(events, { window: 'last_24_hours', now })
    expect(snap.series).toHaveLength(24)
    const total = snap.series.reduce((a, b) => a + b.views, 0)
    expect(total).toBe(3)
    expect(snap.hourlyActivity[10]).toBe(2)
    expect(snap.hourlyActivity[11]).toBe(1)
  })

  it('derives blog article performance with session-gap engaged seconds', () => {
    const events = [
      // session s1 reads hello-world for 120s (gap between events)
      ev({ timestamp: '2026-07-03T10:00:00Z' }),
      ev({ timestamp: '2026-07-03T10:02:00Z', properties: { $pathname: '/products/x' } }),
      // session s2: single event → clamped minimum 5s
      ev({ distinct_id: 'u3', timestamp: '2026-07-03T09:00:00Z', properties: { $session_id: 's2' } }),
    ]
    const snap = aggregateEvents(events, { window: 'last_24_hours', now })
    const article = snap.articles.find((a) => a.slug === 'hello-world')
    expect(article.views).toBe(2)
    expect(article.avgEngagedSeconds).toBeGreaterThanOrEqual(5)
    expect(article.avgEngagedSeconds).toBeLessThanOrEqual(600)
    // 120s gap for s1, 5s min for s2 → avg (120+5)/2
    expect(article.avgEngagedSeconds).toBe(Math.round((120 + 5) / 2))
  })

  it('clamps absurd session gaps to 600s', () => {
    const events = [
      ev({ timestamp: '2026-07-03T08:00:00Z' }),
      ev({ timestamp: '2026-07-03T10:00:00Z', properties: { $pathname: '/other' } }),
    ]
    const snap = aggregateEvents(events, { window: 'last_24_hours', now })
    expect(snap.articles[0].avgEngagedSeconds).toBe(600)
  })

  it('handles empty input', () => {
    const snap = aggregateEvents([], { window: 'last_7_days', now })
    expect(snap.totalViews).toBe(0)
    expect(snap.articles).toEqual([])
    expect(snap.series.length).toBeGreaterThan(0)
  })
})
