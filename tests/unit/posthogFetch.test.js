import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchPageviewEvents, getAnalyticsSnapshot, isConfigured } from '@/lib/analytics/posthog'

beforeEach(() => {
  process.env.POSTHOG_PROJECT_ID = '123'
  process.env.POSTHOG_PERSONAL_API_KEY = 'phx_test'
})
afterEach(() => {
  delete process.env.POSTHOG_PROJECT_ID
  delete process.env.POSTHOG_PERSONAL_API_KEY
})

const page = (results, next = null) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({ results, next }) })

describe('posthog fetch edge', () => {
  it('is unconfigured without env keys', () => {
    delete process.env.POSTHOG_PROJECT_ID
    expect(isConfigured()).toBe(false)
  })

  it('paginates through next links', async () => {
    const fetchImpl = vi
      .fn()
      .mockReturnValueOnce(page([{ id: 1 }], 'https://next.page'))
      .mockReturnValueOnce(page([{ id: 2 }]))
    const events = await fetchPageviewEvents(
      { since: new Date('2026-07-01'), until: new Date('2026-07-02') },
      fetchImpl,
    )
    expect(events).toHaveLength(2)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe('Bearer phx_test')
    expect(fetchImpl.mock.calls[0][0]).toContain('/api/projects/123/events/')
  })

  it('caches snapshots per window for 45s', async () => {
    const fetchImpl = vi.fn().mockImplementation(() => page([]))
    const now = new Date('2026-07-03T00:00:00Z')
    await getAnalyticsSnapshot('last_hour', fetchImpl, now)
    await getAnalyticsSnapshot('last_hour', fetchImpl, new Date(now.getTime() + 10_000))
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    await getAnalyticsSnapshot('last_hour', fetchImpl, new Date(now.getTime() + 60_000))
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('returns null when unconfigured', async () => {
    delete process.env.POSTHOG_PERSONAL_API_KEY
    expect(await getAnalyticsSnapshot('last_hour')).toBeNull()
  })
})
