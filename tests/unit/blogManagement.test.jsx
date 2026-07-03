import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import BlogManagement from '@/components/Admin/BlogManagement'

vi.mock('@/components/General/ToastProvider', () => ({ useToast: () => ({ showToast: vi.fn() }) }))
vi.mock('@/components/Admin/CMSFields/ImageUpload', () => ({ default: () => <div>image-upload</div> }))
vi.mock('@/components/Admin/BlogEditor/TiptapEditor', () => ({
  default: ({ onChange }) => <button onClick={() => onChange({ type: 'doc', content: [] })}>tiptap-editor</button>,
}))
vi.mock('next/dynamic', () => ({ default: () => () => <div>md-editor</div> }))

const posts = [
  { _id: '1', title: 'Live post', slug: 'live', status: 'published', published: true, updatedAt: '2026-01-02', tags: [], categories: [] },
  { _id: '2', title: 'WIP post', slug: 'wip', status: 'draft', published: false, updatedAt: '2026-01-02', tags: [], categories: [], contentFormat: 'tiptap' },
]

let fetchCalls
beforeEach(() => {
  fetchCalls = []
  global.fetch = vi.fn((url, opts = {}) => {
    fetchCalls.push([url, opts])
    if (String(url).includes('/draft')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, draft: null }) })
    if (String(url).includes('slug-exists')) return Promise.resolve({ ok: true, json: () => Promise.resolve({ exists: false }) })
    if (opts.method === 'POST') return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, post: posts[1] }) })
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, posts }) })
  })
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('BlogManagement', () => {
  it('lists posts with status badges and filters by status', async () => {
    render(<BlogManagement />)
    expect(await screen.findByText('Live post')).toBeInTheDocument()
    expect(screen.getByText('WIP post')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'published' }))
    expect(screen.getByText('Live post')).toBeInTheDocument()
    expect(screen.queryByText('WIP post')).toBeNull()
  })

  it('opens a tiptap post in the rich editor and saves with status', async () => {
    render(<BlogManagement />)
    fireEvent.click(await screen.findByText('WIP post'))
    expect(await screen.findByText('tiptap-editor')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => {
      const save = fetchCalls.find(([u, o]) => u === '/api/admin/blog' && o.method === 'POST')
      expect(save).toBeTruthy()
      const body = JSON.parse(save[1].body)
      expect(body.status).toBe('draft')
      expect(body.contentFormat).toBe('tiptap')
      expect(body.slug).toBe('wip')
    })
  })

  it('blocks publishing without any image', async () => {
    render(<BlogManagement />)
    fireEvent.click(await screen.findByText('WIP post'))
    await screen.findByText('tiptap-editor')
    fireEvent.change(screen.getByDisplayValue('Draft'), { target: { value: 'published' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    // no POST save should have been sent (only list/draft/slug fetches)
    await new Promise((r) => setTimeout(r, 50))
    const save = fetchCalls.find(([u, o]) => u === '/api/admin/blog' && o.method === 'POST')
    expect(save).toBeFalsy()
  })
})
