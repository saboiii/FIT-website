import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import AnalyticsPanel from '@/components/Admin/AnalyticsPanel'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const snapshot = {
  window: 'last_7_days',
  totalViews: 42,
  uniqueVisitors: 7,
  series: [{ t: '2026-07-01T00:00:00Z', views: 42 }],
  hourlyActivity: Array(24).fill(0),
  sources: [{ name: 'google.com', count: 30 }, { name: 'Direct', count: 12 }],
  devices: [{ name: 'Desktop', count: 40 }],
  browsers: [{ name: 'Chrome', count: 41 }],
  countries: [{ name: 'Singapore', count: 42 }],
  articles: [{ slug: 'hello-world', views: 12, avgEngagedSeconds: 90 }],
}

describe('AnalyticsPanel', () => {
  it('shows the connect empty state when unconfigured', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ configured: false }) }))
    render(<AnalyticsPanel />)
    expect(await screen.findByText('Analytics not connected')).toBeInTheDocument()
    expect(screen.getByText(/POSTHOG_PERSONAL_API_KEY/)).toBeInTheDocument()
  })

  it('renders stat tiles, breakdowns and top articles from a snapshot', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ configured: true, snapshot }) }))
    render(<AnalyticsPanel />)
    expect((await screen.findAllByText('42')).length).toBeGreaterThan(0)
    expect(screen.getByText('Page views')).toBeInTheDocument()
    expect(screen.getByText('Unique visitors')).toBeInTheDocument()
    expect(screen.getByText('google.com')).toBeInTheDocument()
    expect(screen.getByText('hello-world')).toBeInTheDocument()
    expect(screen.getByText(/~90s read/)).toBeInTheDocument()
  })
})
