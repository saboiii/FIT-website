import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react'
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

const json = (body) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) })

let fetchCalls
let draftGet
let slugExists
beforeEach(() => {
  fetchCalls = []
  draftGet = { ok: true, draft: null }
  slugExists = false
  global.fetch = vi.fn((url, opts = {}) => {
    fetchCalls.push([String(url), opts])
    const u = String(url)
    if (u.includes('/draft')) {
      if (opts.method === 'PUT') return json({ ok: true, savedAt: '2026-07-05T10:20:30Z' })
      if (opts.method === 'DELETE') return json({ ok: true })
      return json(draftGet)
    }
    if (u.includes('slug-exists')) return json({ exists: slugExists })
    if (u.includes('/clone')) return json({ ok: true, post: posts[1] })
    if (opts.method === 'DELETE') return json({ ok: true })
    if (opts.method === 'POST') return json({ ok: true, post: posts[1] })
    return json({ ok: true, posts })
  })
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const openWipPost = async () => {
  render(<BlogManagement />)
  fireEvent.click(await screen.findByText('WIP post'))
  await screen.findByText('tiptap-editor')
}

// The stepped "Publish details" flow lives in a Sheet off the GlassBar.
const openDetails = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Publish details' }))
}
const goToStep = (title) => {
  fireEvent.click(screen.getByRole('button', { name: title }))
}
const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next' }))

describe('BlogManagement', () => {
  it('lists posts with one status pill each and filters via view tabs', async () => {
    render(<BlogManagement />)
    expect(await screen.findByText('Live post')).toBeInTheDocument()
    expect(screen.getByText('WIP post')).toBeInTheDocument()
    // status vocabulary pills (lowercase status text, distinct from tab labels)
    expect(screen.getByText('published')).toBeInTheDocument()
    expect(screen.getByText('draft')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: /Published/ }))
    expect(screen.getByText('Live post')).toBeInTheDocument()
    expect(screen.queryByText('WIP post')).toBeNull()
  })

  it('opens a tiptap post in focus mode and saves with status', async () => {
    await openWipPost()

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

  it('renders no toolbar chrome of its own — formatting is delegated to the (mocked) TipTap bubble/floating menus', async () => {
    await openWipPost()
    for (const name of ['Bold', 'Italic', 'Bullet list', 'Insert image', 'Quote']) {
      expect(screen.queryByRole('button', { name })).toBeNull()
    }
  })

  it('keeps the writing surface clean: no metadata fields outside the details flow', async () => {
    await openWipPost()
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByText('tiptap-editor')).toBeInTheDocument()
    // Metadata is not part of the paper surface any more.
    expect(screen.queryByLabelText('Slug')).toBeNull()
    expect(screen.queryByLabelText('Excerpt')).toBeNull()
    expect(screen.queryByLabelText('Status')).toBeNull()
    expect(screen.getByRole('button', { name: 'Publish details' })).toBeInTheDocument()
  })

  it('guides publish details step by step and keeps every relocated field', async () => {
    await openWipPost()
    openDetails()
    expect(await screen.findByRole('dialog', { name: 'Publish details' })).toBeInTheDocument()

    // Step 1: Basics — slug + excerpt only.
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument()
    expect(screen.getByLabelText('Slug')).toHaveValue('wip')
    expect(screen.getByLabelText('Excerpt')).toBeInTheDocument()
    expect(screen.queryByLabelText('CTA Tag')).toBeNull()
    expect(screen.queryByLabelText('Status')).toBeNull()

    // Step 2: Cover and CTA.
    next()
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument()
    expect(screen.getByText('image-upload')).toBeInTheDocument()
    expect(screen.getByLabelText('CTA Tag')).toBeInTheDocument()
    expect(screen.getByLabelText('CTA Text')).toBeInTheDocument()
    expect(screen.getByLabelText('CTA URL')).toBeInTheDocument()
    expect(screen.queryByLabelText('Slug')).toBeNull()

    // Step 3: Tags and SEO.
    next()
    expect(screen.getByText('Step 3 of 4')).toBeInTheDocument()
    expect(screen.getByLabelText('Meta Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Meta Description')).toBeInTheDocument()
    expect(screen.getByLabelText('Tags (comma separated)')).toBeInTheDocument()
    expect(screen.getByLabelText('Categories (comma separated)')).toBeInTheDocument()

    // Step 4: Schedule and publish, with the summary at the end.
    next()
    expect(screen.getByText('Step 4 of 4')).toBeInTheDocument()
    expect(screen.getByLabelText('Featured post')).toBeInTheDocument()
    expect(screen.getByLabelText('Status')).toHaveValue('draft')
    expect(screen.getByLabelText('Schedule publish (drafts)')).toBeInTheDocument()
    expect(screen.getByText('Summary')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save post' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull()

    // Back returns to the previous step; steps can also be jumped to directly.
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByText('Step 3 of 4')).toBeInTheDocument()
    goToStep('Basics')
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument()
  })

  it('blocks publishing without any image (guarded CTA + step note)', async () => {
    await openWipPost()
    openDetails()
    goToStep('Schedule and publish')
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'published' } })

    expect(screen.getByText('Add a hero or inline image before publishing.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Publish post' })).toBeDisabled()
    // The GlassBar CTA is guarded too.
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Publish post' }))
    await new Promise((r) => setTimeout(r, 50))
    const save = fetchCalls.find(([u, o]) => u === '/api/admin/blog' && o.method === 'POST')
    expect(save).toBeFalsy()
  })

  it('shows the live slug-uniqueness state and blocks saving a taken slug', async () => {
    slugExists = true
    await openWipPost()
    openDetails()
    expect(await screen.findByText('This slug is already in use.', {}, { timeout: 2000 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('autosaves the form to the draft endpoint after 5 seconds', async () => {
    await openWipPost()
    openDetails()
    // Fake only timeouts: faking rAF would strand framer-motion's frame loop
    // and break exit animations in the tests that follow.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    fireEvent.change(screen.getByLabelText('Excerpt'), { target: { value: 'Fresh excerpt' } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    vi.useRealTimers()

    const put = fetchCalls.find(([u, o]) => u.includes('/api/admin/blog/2/draft') && o.method === 'PUT')
    expect(put).toBeTruthy()
    expect(JSON.parse(put[1].body).form.excerpt).toBe('Fresh excerpt')
    expect(await screen.findByText(/Autosaved/)).toBeInTheDocument()
  })

  it('offers a restore strip for a newer autosave and restores it', async () => {
    draftGet = {
      ok: true,
      draft: {
        updatedAt: '2026-03-01T00:00:00Z',
        form: { title: 'WIP post', excerpt: 'Recovered excerpt', contentFormat: 'tiptap', tags: [], categories: [], _id: '2' },
      },
    }
    await openWipPost()
    expect(await screen.findByText(/unsaved autosave from/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
    expect(screen.queryByText(/unsaved autosave from/)).toBeNull()
    openDetails()
    expect(screen.getByLabelText('Excerpt')).toHaveValue('Recovered excerpt')
  })

  it('clones a post from its list row', async () => {
    render(<BlogManagement />)
    await screen.findByText('Live post')
    fireEvent.click(screen.getAllByRole('button', { name: 'Clone' })[0])
    await waitFor(() => {
      expect(fetchCalls.some(([u, o]) => u === '/api/admin/blog/1/clone' && o.method === 'POST')).toBe(true)
    })
  })

  it('sends a schedule datetime as ISO when saving from the final step', async () => {
    await openWipPost()
    openDetails()
    goToStep('Schedule and publish')
    fireEvent.change(screen.getByLabelText('Schedule publish (drafts)'), { target: { value: '2026-08-01T10:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save post' }))
    await waitFor(() => {
      const save = fetchCalls.find(([u, o]) => u === '/api/admin/blog' && o.method === 'POST')
      expect(save).toBeTruthy()
      expect(JSON.parse(save[1].body).scheduledFor).toBe(new Date('2026-08-01T10:00').toISOString())
    })
    // A successful save closes the details sheet.
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Publish details' })).toBeNull()
    })
  })

  it('opens the live preview sheet with an iframe of the real blog page', async () => {
    await openWipPost()
    fireEvent.click(screen.getByRole('button', { name: 'Preview' }))
    expect(await screen.findByRole('dialog', { name: 'Post preview' })).toBeInTheDocument()
    const iframe = screen.getByTitle('Blog Preview')
    expect(iframe.tagName).toBe('IFRAME')
    expect(iframe).toHaveAttribute('src', expect.stringContaining('/blog/wip'))
  })

  it('deletes via ConfirmDialog, never window.confirm', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm')
    await openWipPost()
    openDetails()
    goToStep('Schedule and publish')
    fireEvent.click(screen.getByRole('button', { name: 'Delete post' }))
    expect(await screen.findByText('Delete this post?')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => {
      expect(fetchCalls.some(([u, o]) => u === '/api/admin/blog' && o.method === 'DELETE')).toBe(true)
    })
    expect(confirmSpy).not.toHaveBeenCalled()
  })
})
