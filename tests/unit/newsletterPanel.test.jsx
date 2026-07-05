// Newsletter admin panel (WP6c) — the restyle must not change any API
// payload, and window.confirm is banned (ConfirmDialog replaces it).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react'
import NewsletterManagement from '@/components/Admin/NewsletterManagement'

vi.mock('@/components/General/ToastProvider', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}))

const campaigns = [
  { _id: 'c1', subject: 'Spring drop', status: 'draft', counts: {}, stats: {} },
  {
    _id: 'c2',
    subject: 'Sent one',
    status: 'sent',
    sentAt: '2026-06-01T10:00:00Z',
    counts: { sent: 120, failed: 2 },
    stats: { open: 40, click: 9 },
  },
  { _id: 'c3', subject: 'Scheduled one', status: 'scheduled', scheduledFor: '2026-08-01T10:00:00Z', counts: {}, stats: {} },
]
const posts = [{ _id: 'p1', title: 'Post one', published: true, heroImage: 'blog/hero.jpg' }]
const interests = [{ _id: 'i1', name: 'Tips' }]
const subscribers = [{ email: 'a@b.c', fullName: 'Abe', status: 'active', interestIds: [] }]

beforeEach(() => {
  global.fetch = vi.fn((url, opts = {}) => {
    const respond = (data) => Promise.resolve({ ok: true, json: () => Promise.resolve(data) })
    if (url.startsWith('/api/admin/newsletter/interests')) return respond({ interests })
    if (url.startsWith('/api/admin/newsletter/subscribers')) return respond({ subscribers })
    if (url.includes('/send')) return respond({ ok: true })
    if (url.includes('/duplicate')) return respond({ ok: true })
    if (url.startsWith('/api/admin/blog')) return respond({ posts })
    if (url === '/api/admin/newsletter' && opts.method === 'POST') return respond({ ok: true, campaign: {} })
    if (url === '/api/admin/newsletter') return respond({ campaigns })
    return respond({})
  })
  localStorage.clear()
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('NewsletterManagement — campaigns', () => {
  it('saves a campaign with the unchanged payload shape (scheduledFor as ISO)', async () => {
    render(<NewsletterManagement />)
    await screen.findByText('Spring drop')

    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Hello world' } })
    fireEvent.change(screen.getByLabelText(/Schedule/), { target: { value: '2026-08-02T09:30' } })
    fireEvent.click(screen.getByText('Save & schedule'))

    await waitFor(() => {
      const call = global.fetch.mock.calls.find(
        ([url, opts]) => url === '/api/admin/newsletter' && opts?.method === 'POST',
      )
      expect(call).toBeTruthy()
      const body = JSON.parse(call[1].body)
      // Byte-identical payload contract: same keys, nothing extra.
      expect(Object.keys(body).sort()).toEqual(['articleIds', 'audience', 'intro', 'scheduledFor', 'subject'])
      expect(body.subject).toBe('Hello world')
      expect(body.intro).toBe('')
      expect(body.articleIds).toEqual([])
      expect(body.audience).toEqual({ type: 'all', interestIds: [] })
      expect(body.scheduledFor).toBe(new Date('2026-08-02T09:30').toISOString())
    })
  })

  it('Send now confirms through ConfirmDialog, never window.confirm', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    render(<NewsletterManagement />)

    const sendButtons = await screen.findAllByRole('button', { name: 'Send now' })
    fireEvent.click(sendButtons[0]) // the draft row (c1)

    expect(confirmSpy).not.toHaveBeenCalled()
    const dialog = await screen.findByRole('dialog', { name: 'Send campaign' })
    expect(within(dialog).getByText('Send this campaign to its audience now?')).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Send now' }))
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/newsletter/c1/send', { method: 'POST' })
    })
  })

  it('Delete confirms through ConfirmDialog, never window.confirm', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    render(<NewsletterManagement />)

    const deleteButtons = await screen.findAllByRole('button', { name: 'Delete' })
    fireEvent.click(deleteButtons[0])

    expect(confirmSpy).not.toHaveBeenCalled()
    const dialog = await screen.findByRole('dialog', { name: 'Delete campaign' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/admin/newsletter',
        expect.objectContaining({ method: 'DELETE', body: JSON.stringify({ _id: 'c1' }) }),
      )
    })
  })

  it('renders history rows with status pills and dash-data counts', async () => {
    render(<NewsletterManagement />)
    await screen.findByText('Spring drop')

    expect(screen.getByText('draft')).toBeInTheDocument()
    expect(screen.getByText('sent')).toBeInTheDocument()
    expect(screen.getByText('scheduled')).toBeInTheDocument()
    expect(screen.getByText(/120 sent · 40 opens · 9 clicks · 2 failed/)).toBeInTheDocument()
  })
})

describe('NewsletterManagement — subscribers', () => {
  it('keeps the interest filter and the xlsx export link', async () => {
    render(<NewsletterManagement />)
    fireEvent.click(screen.getByRole('tab', { name: 'Subscribers' }))

    await screen.findByText(/a@b\.c/)
    expect(screen.getByText('active')).toBeInTheDocument()

    const exportLink = screen.getByRole('link', { name: 'Export .xlsx' })
    expect(exportLink).toHaveAttribute('href', '/api/admin/newsletter/subscribers/export')

    // Interest filter still drives the subscriber fetch
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'i1' } })
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/newsletter/subscribers?interestId=i1')
    })
    expect(screen.getByRole('link', { name: 'Export .xlsx' })).toHaveAttribute(
      'href',
      '/api/admin/newsletter/subscribers/export?interestId=i1',
    )
  })
})
