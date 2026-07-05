// Pure aggregation of PostHog $pageview events into the admin snapshot.
// No fetch/env here — see lib/analytics/posthog.js for the edge.

export const RANGE_PRESETS = [
  'last_hour',
  'last_24_hours',
  'today',
  'yesterday',
  'last_7_days',
  'last_30_days',
  'last_90_days',
]

const HOUR = 3600 * 1000
const DAY = 24 * HOUR

export function rangeToInterval(window, now = new Date()) {
  const n = now.getTime()
  switch (window) {
    case 'last_hour':
      return { since: new Date(n - HOUR), until: now, bucket: 'hour' }
    case 'last_24_hours':
      return { since: new Date(n - DAY), until: now, bucket: 'hour' }
    case 'today': {
      const start = new Date(now)
      start.setUTCHours(0, 0, 0, 0)
      return { since: start, until: now, bucket: 'hour' }
    }
    case 'yesterday': {
      const start = new Date(now)
      start.setUTCHours(0, 0, 0, 0)
      return { since: new Date(start.getTime() - DAY), until: start, bucket: 'hour' }
    }
    case 'last_30_days':
      return { since: new Date(n - 30 * DAY), until: now, bucket: 'day' }
    case 'last_90_days':
      return { since: new Date(n - 90 * DAY), until: now, bucket: 'day' }
    case 'last_7_days':
    default:
      return { since: new Date(n - 7 * DAY), until: now, bucket: 'day' }
  }
}

const countInto = (map, key) => {
  if (!key) return
  map.set(key, (map.get(key) || 0) + 1)
}
const toSorted = (map) =>
  [...map.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)

function pathnameOf(props = {}) {
  if (props.$pathname) return props.$pathname
  try {
    return new URL(props.$current_url).pathname
  } catch {
    return null
  }
}

const BLOG_PATH = /^\/blog\/([^/?#]+)/

// Engaged seconds: gap to the NEXT event in the same session, clamped 5–600s
// (single/last events count the minimum). Same heuristic as eil.
const MIN_ENGAGED = 5
const MAX_ENGAGED = 600

export function aggregateEvents(events = [], { window = 'last_7_days', now = new Date() } = {}) {
  const { since, until, bucket } = rangeToInterval(window, now)

  const sources = new Map()
  const browsers = new Map()
  const devices = new Map()
  const countries = new Map()
  const visitors = new Set()
  const hourlyActivity = Array(24).fill(0)

  // series buckets covering the whole range
  const bucketMs = bucket === 'hour' ? HOUR : DAY
  const bucketCount = Math.max(1, Math.ceil((until - since) / bucketMs))
  const series = Array.from({ length: bucketCount }, (_, i) => ({
    t: new Date(since.getTime() + i * bucketMs).toISOString(),
    views: 0,
  }))

  // per-session ordered events for engaged-time gaps
  const sessions = new Map()

  for (const e of events) {
    const ts = new Date(e.timestamp)
    if (Number.isNaN(ts.getTime())) continue
    const props = e.properties || {}

    const idx = Math.floor((ts - since) / bucketMs)
    if (idx >= 0 && idx < bucketCount) series[idx].views += 1
    hourlyActivity[ts.getUTCHours()] += 1

    visitors.add(e.distinct_id)
    const referrer = props.$referring_domain
    countInto(sources, referrer === '$direct' ? 'Direct' : referrer)
    countInto(browsers, props.$browser)
    countInto(devices, props.$device_type)
    countInto(countries, props.$geoip_country_name)

    const sessionKey = `${e.distinct_id}:${props.$session_id || 'nosession'}`
    if (!sessions.has(sessionKey)) sessions.set(sessionKey, [])
    sessions.get(sessionKey).push({ ts: ts.getTime(), pathname: pathnameOf(props) })
  }

  // article performance
  const articles = new Map() // slug -> { views, engagedTotal, engagedCount }
  for (const list of sessions.values()) {
    list.sort((a, b) => a.ts - b.ts)
    for (let i = 0; i < list.length; i++) {
      const m = list[i].pathname && list[i].pathname.match(BLOG_PATH)
      if (!m) continue
      const slug = decodeURIComponent(m[1])
      if (!articles.has(slug)) articles.set(slug, { views: 0, engagedTotal: 0, engagedCount: 0 })
      const a = articles.get(slug)
      a.views += 1
      const next = list[i + 1]
      const gap = next ? Math.round((next.ts - list[i].ts) / 1000) : MIN_ENGAGED
      a.engagedTotal += Math.min(MAX_ENGAGED, Math.max(MIN_ENGAGED, gap))
      a.engagedCount += 1
    }
  }

  return {
    window,
    since: since.toISOString(),
    until: until.toISOString(),
    totalViews: events.length,
    uniqueVisitors: visitors.size,
    series,
    hourlyActivity,
    sources: toSorted(sources),
    browsers: toSorted(browsers),
    devices: toSorted(devices),
    countries: toSorted(countries),
    articles: [...articles.entries()]
      .map(([slug, a]) => ({
        slug,
        views: a.views,
        avgEngagedSeconds: a.engagedCount ? Math.round(a.engagedTotal / a.engagedCount) : 0,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 20),
  }
}
