// Fetch edge for PostHog's Query/Events API. Pure compute lives in
// lib/analytics/aggregate.js. No-ops (returns null) when env is missing —
// the admin dashboard shows a "connect PostHog" empty state instead.
import { aggregateEvents, rangeToInterval } from '@/lib/analytics/aggregate'

const HOST = () => process.env.POSTHOG_API_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.posthog.com'
const PROJECT_ID = () => process.env.POSTHOG_PROJECT_ID
const API_KEY = () => process.env.POSTHOG_PERSONAL_API_KEY

const MAX_PAGES = 20
const CACHE_TTL_MS = 45 * 1000
const cache = new Map() // window -> { at, snapshot }

export function isConfigured() {
  return Boolean(PROJECT_ID() && API_KEY())
}

export async function fetchPageviewEvents({ since, until }, fetchImpl = fetch) {
  const events = []
  let url = `${HOST()}/api/projects/${PROJECT_ID()}/events/?event=%24pageview&after=${encodeURIComponent(
    since.toISOString(),
  )}&before=${encodeURIComponent(until.toISOString())}&limit=1000`
  for (let page = 0; url && page < MAX_PAGES; page++) {
    const res = await fetchImpl(url, {
      headers: { Authorization: `Bearer ${API_KEY()}` },
    })
    if (!res.ok) throw new Error(`PostHog API ${res.status}`)
    const data = await res.json()
    events.push(...(data.results || []))
    url = data.next || null
  }
  return events
}

export async function getAnalyticsSnapshot(window, fetchImpl = fetch, now = new Date()) {
  if (!isConfigured()) return null
  const cached = cache.get(window)
  if (cached && now.getTime() - cached.at < CACHE_TTL_MS) return cached.snapshot
  const { since, until } = rangeToInterval(window, now)
  const events = await fetchPageviewEvents({ since, until }, fetchImpl)
  const snapshot = aggregateEvents(events, { window, now })
  cache.set(window, { at: now.getTime(), snapshot })
  return snapshot
}
