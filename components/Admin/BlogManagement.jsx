"use client"
import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import ImageUpload from '@/components/Admin/CMSFields/ImageUpload'
import TiptapEditor from '@/components/Admin/BlogEditor/TiptapEditor'
import { useToast } from '@/components/General/ToastProvider'
import { IoRefresh } from 'react-icons/io5'
import { MdOpenInNew } from 'react-icons/md'
import { BsPlusLg } from 'react-icons/bs'

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })

function slugify(s) {
    return s
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 200)
}

const EMPTY_FORM = {
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    contentJson: null,
    contentFormat: 'tiptap',
    heroImage: '',
    cta: { tag: '', text: '', url: '' },
    metaTitle: '',
    metaDescription: '',
    tags: [],
    categories: [],
    status: 'draft',
    scheduledFor: '',
    featured: false,
}

const STATUS_STYLES = {
    published: 'bg-green-50 text-green-700 border-green-200',
    draft: 'bg-amber-50 text-amber-700 border-amber-200',
    hidden: 'bg-gray-100 text-gray-500 border-gray-200',
}

function StatusBadge({ status }) {
    return (
        <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${STATUS_STYLES[status] || STATUS_STYLES.draft}`}>
            {status}
        </span>
    )
}

function hasImage(form) {
    if (form.heroImage) return true
    const walk = (n) => {
        if (!n || typeof n !== 'object') return false
        if (n.type === 'image') return true
        return Array.isArray(n.content) && n.content.some(walk)
    }
    return walk(form.contentJson)
}

function postToForm(post) {
    return {
        title: post.title || '',
        slug: post.slug || '',
        excerpt: post.excerpt || '',
        content: post.content || '',
        contentJson: post.contentJson || null,
        contentFormat: post.contentFormat === 'tiptap' ? 'tiptap' : 'markdown',
        heroImage: post.heroImage || '',
        cta: post.cta || { tag: '', text: '', url: '' },
        metaTitle: post.metaTitle || '',
        metaDescription: post.metaDescription || '',
        tags: post.tags || [],
        categories: post.categories || [],
        status: post.status || (post.published ? 'published' : 'draft'),
        scheduledFor: post.scheduledFor ? new Date(post.scheduledFor).toISOString().slice(0, 16) : '',
        featured: !!post.featured,
        _id: post._id,
    }
}

export default function BlogManagement() {
    const [posts, setPosts] = useState([])
    const [selected, setSelected] = useState(null)
    const [loading, setLoading] = useState(false)
    const [statusFilter, setStatusFilter] = useState('all')
    const [previewKey, setPreviewKey] = useState(0)
    const [form, setForm] = useState(EMPTY_FORM)
    const [tagsInput, setTagsInput] = useState('')
    const [categoriesInput, setCategoriesInput] = useState('')
    const [slugTaken, setSlugTaken] = useState(false)
    const [restorableDraft, setRestorableDraft] = useState(null)
    const [autosavedAt, setAutosavedAt] = useState(null)
    const { showToast } = useToast()
    const autosaveTimer = useRef(null)
    const formRef = useRef(form)
    formRef.current = form

    const fetchList = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/blog')
            const data = await res.json()
            if (data.ok) setPosts(data.posts || [])
        } catch (err) {
            console.error(err)
        } finally { setLoading(false) }
    }

    useEffect(() => { fetchList() }, [])

    const handleSelect = async (post) => {
        setSelected(post)
        setForm(postToForm(post))
        setTagsInput((post.tags || []).join(', '))
        setCategoriesInput((post.categories || []).join(', '))
        setSlugTaken(false)
        setAutosavedAt(null)
        setRestorableDraft(null)
        // Autosave restore: newer snapshot than the saved post?
        try {
            const res = await fetch(`/api/admin/blog/${post._id}/draft`)
            const data = await res.json()
            if (data.ok && data.draft?.form && new Date(data.draft.updatedAt) > new Date(post.updatedAt)) {
                setRestorableDraft(data.draft)
            }
        } catch { /* non-fatal */ }
    }

    const handleNew = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/blog', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: 'Untitled Post', contentFormat: 'tiptap', status: 'draft' }),
            })
            const data = await res.json()
            if (!data.ok) throw new Error(data.error || 'Create failed')
            await fetchList()
            if (data.post) handleSelect(data.post)
        } catch (err) {
            console.error(err)
            showToast('Create failed', 'error')
        } finally {
            setLoading(false)
        }
    }

    const buildPayload = (f = formRef.current) => ({
        ...f,
        tags: (tagsInput || '').split(',').map((s) => s.trim()).filter(Boolean),
        categories: (categoriesInput || '').split(',').map((s) => s.trim()).filter(Boolean),
        slug: f.slug || (f.title ? slugify(f.title) : ''),
        scheduledFor: f.scheduledFor ? new Date(f.scheduledFor).toISOString() : null,
    })

    const handleSave = async () => {
        const payload = buildPayload()
        if (payload.status === 'published' && !hasImage(payload)) {
            showToast('Add a hero or inline image before publishing', 'error')
            return
        }
        try {
            const res = await fetch('/api/admin/blog', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const data = await res.json()
            if (!data.ok) throw new Error(data.error || 'Save failed')
            showToast('Saved', 'success')
            fetchList()
            if (data.post) {
                // saved: the autosave snapshot is stale now
                fetch(`/api/admin/blog/${data.post._id}/draft`, { method: 'DELETE' }).catch(() => { })
                setSelected(data.post)
                setForm(postToForm(data.post))
                setRestorableDraft(null)
            }
            setPreviewKey((k) => k + 1)
        } catch (err) {
            console.error(err)
            showToast('Save failed', 'error')
        }
    }

    const handleClone = async (post) => {
        try {
            const res = await fetch(`/api/admin/blog/${post._id}/clone`, { method: 'POST' })
            const data = await res.json()
            if (!data.ok) throw new Error(data.error || 'Clone failed')
            showToast('Cloned', 'success')
            await fetchList()
            if (data.post) handleSelect(data.post)
        } catch (err) {
            console.error(err)
            showToast('Clone failed', 'error')
        }
    }

    const handleDelete = async () => {
        if (!selected) return
        if (!confirm('Delete this post?')) return
        try {
            const res = await fetch('/api/admin/blog', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ _id: selected._id }),
            })
            const data = await res.json()
            if (!data.ok) throw new Error(data.error || 'Delete failed')
            showToast('Deleted', 'success')
            setSelected(null)
            setForm(EMPTY_FORM)
            setTagsInput('')
            setCategoriesInput('')
            fetchList()
        } catch (err) {
            console.error(err)
            showToast('Delete failed', 'error')
        }
    }

    // Live slug uniqueness check (debounced).
    useEffect(() => {
        const slug = form.slug
        if (!slug) { setSlugTaken(false); return }
        const t = setTimeout(async () => {
            try {
                const res = await fetch('/api/admin/blog/slug-exists', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ slug, excludeId: form._id }),
                })
                const data = await res.json()
                setSlugTaken(Boolean(data.exists))
            } catch { /* non-fatal */ }
        }, 500)
        return () => clearTimeout(t)
    }, [form.slug, form._id])

    // Debounced autosave of the in-progress form (existing posts only).
    const scheduleAutosave = useCallback(() => {
        if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
        autosaveTimer.current = setTimeout(async () => {
            const f = formRef.current
            if (!f._id) return
            try {
                const res = await fetch(`/api/admin/blog/${f._id}/draft`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ form: f }),
                })
                const data = await res.json()
                if (data.ok) setAutosavedAt(data.savedAt)
            } catch { /* non-fatal */ }
        }, 5000)
    }, [])

    const updateForm = (patch) => {
        setForm((f) => ({ ...f, ...patch }))
        scheduleAutosave()
    }

    const restoreDraft = () => {
        if (!restorableDraft?.form) return
        const f = restorableDraft.form
        setForm({ ...EMPTY_FORM, ...f })
        setTagsInput((f.tags || []).join(', '))
        setCategoriesInput((f.categories || []).join(', '))
        setRestorableDraft(null)
        showToast('Draft restored — save to keep it', 'success')
    }

    const filteredPosts = statusFilter === 'all' ? posts : posts.filter((p) => (p.status || 'draft') === statusFilter)
    const previewUrl = form.slug ? `/blog/${encodeURIComponent(form.slug)}?previewKey=${previewKey}` : null
    const isTiptap = form.contentFormat === 'tiptap'

    return (
        <div className='flex gap-4 flex-col p-6 md:p-12 bg-borderColor/60'>
            <div className='flex flex-col lg:flex-row gap-4 sm:gap-6 min-h-[70vh]'>
                <div className="w-full lg:w-1/3 adminDashboardContainer overflow-auto">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-base sm:text-lg">Blog Posts</h3>
                        <button onClick={handleNew} className="px-2.5 sm:px-3 py-1.5 sm:py-2 border border-borderColor rounded text-xs hover:bg-baseColor transition flex items-center gap-1 cursor-pointer" title="New post">
                            <BsPlusLg />
                        </button>
                    </div>
                    <div className="flex gap-1 mb-3">
                        {['all', 'published', 'draft', 'hidden'].map((s) => (
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={`px-2 py-1 rounded-full text-[10px] uppercase tracking-wide border border-borderColor cursor-pointer ${statusFilter === s ? 'bg-textColor text-background' : 'text-lightColor hover:bg-borderColor/20'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                    {loading && <div className="text-sm">Loading...</div>}
                    <ul className="flex gap-2 flex-col w-full max-h-[48vh] overflow-y-auto">
                        {filteredPosts.map(p => (
                            <li key={p._id} className={`p-3 sm:p-4 border border-borderColor w-full rounded cursor-pointer hover:text-textColor/80 transition-colors duration-100 ease-in-out ${selected && selected._id === p._id ? '' : 'bg-borderColor/40 text-lightColor'}`} onClick={() => handleSelect(p)}>
                                <div className="flex items-center justify-between gap-2">
                                    <div className="font-medium text-xs sm:text-sm truncate">{p.title}</div>
                                    <StatusBadge status={p.status || 'draft'} />
                                </div>
                                <div className="flex items-center justify-between gap-2 mt-1">
                                    <div className="text-xs text-lightColor truncate">{p.slug}</div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleClone(p) }}
                                        className="text-[10px] text-lightColor hover:text-textColor underline cursor-pointer"
                                    >
                                        Clone
                                    </button>
                                </div>
                                {p.scheduledFor && (p.status || 'draft') === 'draft' && (
                                    <div className="text-[10px] text-amber-600 mt-1">
                                        Scheduled: {new Date(p.scheduledFor).toLocaleString()}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="adminDashboardContainer w-full flex flex-col gap-4">
                    {restorableDraft && (
                        <div className="flex items-center justify-between border border-amber-300 bg-amber-50 rounded-md px-3 py-2">
                            <p className="text-xs text-amber-800">
                                An unsaved autosave from {new Date(restorableDraft.updatedAt).toLocaleString()} exists.
                            </p>
                            <div className="flex gap-2">
                                <button onClick={restoreDraft} className="text-xs underline text-amber-800 cursor-pointer">Restore</button>
                                <button onClick={() => setRestorableDraft(null)} className="text-xs text-amber-800/70 cursor-pointer">Dismiss</button>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                        <div className='flex flex-col gap-2'>
                            <label className="formLabel">Title</label>
                            <input className="formInput" value={form.title} onChange={e => updateForm({ title: e.target.value })} />
                        </div>
                        <div className='flex flex-col gap-2'>
                            <label className="formLabel">Slug</label>
                            <input className={`formInput ${slugTaken ? 'border-red-400' : ''}`} value={form.slug} onChange={e => updateForm({ slug: e.target.value })} placeholder="auto-generated from title" />
                            {slugTaken && <p className="text-[11px] text-red-500">This slug is already in use.</p>}
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="formLabel">Excerpt</label>
                        <input className="formInput" value={form.excerpt} onChange={e => updateForm({ excerpt: e.target.value })} />
                    </div>

                    <div className="flex flex-col gap-2">
                        <ImageUpload label="Hero Image" value={form.heroImage} onChange={(v) => updateForm({ heroImage: v })} uploadPath={'blog'} uploadEndpoint={'/api/admin/upload/images'} />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="formLabel">Content</label>
                        {isTiptap ? (
                            <TiptapEditor value={form.contentJson} onChange={(json) => updateForm({ contentJson: json })} />
                        ) : (
                            <>
                                <p className="text-[11px] text-lightColor">Legacy markdown post — edited in Markdown.</p>
                                <div data-color-mode="light">
                                    <MDEditor value={form.content} onChange={(v) => updateForm({ content: v })} height={300} />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                        <div className='flex flex-col gap-2'>
                            <label className="formLabel">CTA Tag</label>
                            <input className="formInput" value={form.cta.tag} onChange={e => updateForm({ cta: { ...form.cta, tag: e.target.value } })} />
                        </div>
                        <div className='flex flex-col gap-2'>
                            <label className="formLabel">CTA Text</label>
                            <input className="formInput" value={form.cta.text} onChange={e => updateForm({ cta: { ...form.cta, text: e.target.value } })} />
                        </div>
                        <div className='flex flex-col gap-2'>
                            <label className="formLabel">CTA URL</label>
                            <input className="formInput" value={form.cta.url} onChange={e => updateForm({ cta: { ...form.cta, url: e.target.value } })} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                        <div className='flex flex-col gap-2'>
                            <label className="formLabel">Meta Title</label>
                            <input className="formInput" value={form.metaTitle} onChange={e => updateForm({ metaTitle: e.target.value })} placeholder="Optional SEO title" />
                        </div>
                        <div className='flex flex-col gap-2'>
                            <label className="formLabel">Meta Description</label>
                            <input className="formInput" value={form.metaDescription} onChange={e => updateForm({ metaDescription: e.target.value })} placeholder="Optional SEO description" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                        <div className="flex flex-col gap-2">
                            <label className="formLabel">Tags (comma separated)</label>
                            <input
                                className="formInput"
                                value={tagsInput}
                                onChange={e => setTagsInput(e.target.value)}
                                placeholder="e.g. design, tutorial, printing"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="formLabel">Categories (comma separated)</label>
                            <input
                                className="formInput"
                                value={categoriesInput}
                                onChange={e => setCategoriesInput(e.target.value)}
                                placeholder="e.g. guides, news"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                        <div className="flex flex-col gap-2">
                            <label className="formLabel">Status</label>
                            <select
                                className="formInput"
                                value={form.status}
                                onChange={e => updateForm({ status: e.target.value })}
                            >
                                <option value="draft">Draft</option>
                                <option value="published">Published</option>
                                <option value="hidden">Hidden</option>
                            </select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="formLabel">Schedule publish (drafts)</label>
                            <input
                                type="datetime-local"
                                className="formInput"
                                value={form.scheduledFor}
                                onChange={e => updateForm({ scheduledFor: e.target.value })}
                                disabled={form.status === 'published'}
                            />
                        </div>
                        <label className="flex items-end gap-2 font-normal text-xs sm:text-sm pb-2">
                            <input type="checkbox" checked={form.featured} onChange={e => updateForm({ featured: e.target.checked })} /> Featured
                        </label>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-center">
                        <button onClick={handleSave} disabled={slugTaken} className="formBlackButton w-full sm:w-auto disabled:opacity-50">{loading ? 'Saving...' : 'Save'}</button>
                        {selected && <button onClick={handleDelete} className="formRedButton w-full sm:w-auto">Delete</button>}
                        {autosavedAt && (
                            <span className="text-[11px] text-lightColor">Autosaved {new Date(autosavedAt).toLocaleTimeString()}</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="adminDashboardContainer mt-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                    <div>
                        <h3 className="font-semibold text-base sm:text-lg">Preview</h3>
                        <p className="text-xs text-gray-600">This shows how the blog post will look on the site. Save changes, then refresh the preview.</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setPreviewKey((k) => k + 1)} className="formButton" type="button"><IoRefresh /></button>
                        <a href={previewUrl || '#'} target="_blank" rel="noreferrer" className="formBlackButton"><MdOpenInNew /></a>
                    </div>
                </div>
                <div className="relative w-full border border-dashed border-borderColor rounded-md overflow-hidden bg-gray-50">
                    {previewUrl ? (
                        <iframe key={previewKey} src={previewUrl} title="Blog Preview" className="w-full" style={{ height: '400px', border: '0' }} />
                    ) : (
                        <div className="p-6 text-xs font-medium text-lightColor">Enter a slug (or save the post) to preview.</div>
                    )}
                </div>
            </div>

        </div>
    )
}
