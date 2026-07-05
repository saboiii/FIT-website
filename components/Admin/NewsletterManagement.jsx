'use client'
import { useEffect, useState } from 'react'
import { useToast } from '@/components/General/ToastProvider'
import { toDatetimeLocal } from '@/utils/datetimeLocal'

const EMPTY_CAMPAIGN = { subject: '', intro: '', articleIds: [], audience: { type: 'all', interestIds: [] }, scheduledFor: '' }

const STATUS_STYLES = {
    sent: 'bg-green-50 text-green-700 border-green-200',
    sending: 'bg-blue-50 text-blue-700 border-blue-200',
    scheduled: 'bg-amber-50 text-amber-700 border-amber-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
    draft: 'bg-gray-100 text-gray-500 border-gray-200',
}

function Badge({ status }) {
    return (
        <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${STATUS_STYLES[status] || STATUS_STYLES.draft}`}>
            {status}
        </span>
    )
}

function Campaigns({ showToast }) {
    const [campaigns, setCampaigns] = useState([])
    const [posts, setPosts] = useState([])
    const [interests, setInterests] = useState([])
    const [form, setForm] = useState(EMPTY_CAMPAIGN)
    const [busy, setBusy] = useState(false)

    const load = async () => {
        const [c, p, i] = await Promise.all([
            fetch('/api/admin/newsletter').then((r) => r.json()).catch(() => ({})),
            fetch('/api/admin/blog').then((r) => r.json()).catch(() => ({})),
            fetch('/api/admin/newsletter/interests').then((r) => r.json()).catch(() => ({})),
        ])
        setCampaigns(c.campaigns || [])
        setPosts((p.posts || []).filter((x) => x.published))
        setInterests(i.interests || [])
    }
    useEffect(() => { load() }, [])

    const saveCampaign = async (extra = {}) => {
        if (!form.subject.trim()) { showToast('Subject required', 'error'); return null }
        setBusy(true)
        try {
            const res = await fetch('/api/admin/newsletter', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    ...extra,
                    scheduledFor: (extra.scheduledFor ?? form.scheduledFor) ? new Date(extra.scheduledFor ?? form.scheduledFor).toISOString() : null,
                }),
            })
            const data = await res.json()
            if (!data.ok) throw new Error(data.error || 'Save failed')
            showToast('Saved', 'success')
            setForm(EMPTY_CAMPAIGN)
            load()
            return data.campaign
        } catch (e) {
            showToast(e.message || 'Save failed', 'error')
            return null
        } finally {
            setBusy(false)
        }
    }

    const sendNow = async (id) => {
        if (!confirm('Send this campaign to its audience now?')) return
        setBusy(true)
        try {
            const res = await fetch(`/api/admin/newsletter/${id}/send`, { method: 'POST' })
            const data = await res.json()
            if (!data.ok) throw new Error(data.error || 'Send failed')
            showToast('Campaign dispatched', 'success')
            load()
        } catch (e) {
            showToast(e.message || 'Send failed', 'error')
        } finally {
            setBusy(false)
        }
    }

    const duplicate = async (id) => {
        await fetch(`/api/admin/newsletter/${id}/duplicate`, { method: 'POST' })
        load()
    }

    const remove = async (id) => {
        if (!confirm('Delete this campaign?')) return
        await fetch('/api/admin/newsletter', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ _id: id }),
        })
        load()
    }

    const toggleArticle = (id) => {
        setForm((f) => ({
            ...f,
            articleIds: f.articleIds.includes(id) ? f.articleIds.filter((x) => x !== id) : [...f.articleIds, id],
        }))
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Composer */}
            <div className="border border-borderColor rounded-md overflow-hidden">
                <div className="bg-borderColor/40 px-4 py-2 border-b border-borderColor">
                    <h3 className="text-sm font-medium text-textColor">{form._id ? 'Edit campaign' : 'New campaign'}</h3>
                </div>
                <div className="p-4 flex flex-col gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-lightColor">Subject</label>
                            <input className="formInput text-sm" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-lightColor">Schedule (optional — empty saves a draft)</label>
                            <input type="datetime-local" className="formInput text-sm" value={form.scheduledFor} onChange={(e) => setForm((f) => ({ ...f, scheduledFor: e.target.value }))} />
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-lightColor">Intro</label>
                        <textarea className="formInput text-sm" rows={2} value={form.intro} onChange={(e) => setForm((f) => ({ ...f, intro: e.target.value }))} />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-lightColor">Articles ({form.articleIds.length} selected)</label>
                        <div className="border border-borderColor rounded-md max-h-40 overflow-y-auto divide-y divide-borderColor">
                            {posts.length === 0 && <p className="text-[11px] text-lightColor p-3">No published posts yet.</p>}
                            {posts.map((p) => (
                                <label key={p._id} className="flex items-center gap-2 px-3 py-2 text-xs text-textColor cursor-pointer hover:bg-baseColor">
                                    <input type="checkbox" checked={form.articleIds.includes(p._id)} onChange={() => toggleArticle(p._id)} />
                                    <span className="truncate">{p.title}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-lightColor">Audience</label>
                        <div className="flex flex-wrap items-center gap-3">
                            <label className="flex items-center gap-1 text-xs">
                                <input type="radio" checked={form.audience.type === 'all'} onChange={() => setForm((f) => ({ ...f, audience: { ...f.audience, type: 'all' } }))} />
                                All subscribers
                            </label>
                            <label className="flex items-center gap-1 text-xs">
                                <input type="radio" checked={form.audience.type === 'interests'} onChange={() => setForm((f) => ({ ...f, audience: { ...f.audience, type: 'interests' } }))} />
                                By interest
                            </label>
                            {form.audience.type === 'interests' && interests.map((i) => (
                                <label key={i._id} className="flex items-center gap-1 text-xs">
                                    <input
                                        type="checkbox"
                                        checked={form.audience.interestIds.includes(String(i._id))}
                                        onChange={() => setForm((f) => {
                                            const id = String(i._id)
                                            const ids = f.audience.interestIds.includes(id)
                                                ? f.audience.interestIds.filter((x) => x !== id)
                                                : [...f.audience.interestIds, id]
                                            return { ...f, audience: { ...f.audience, interestIds: ids } }
                                        })}
                                    />
                                    {i.name}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => saveCampaign()} disabled={busy} className="text-xs px-4 py-2 bg-textColor text-background rounded-full hover:bg-textColor/90 cursor-pointer disabled:opacity-50">
                            {form.scheduledFor ? 'Save & schedule' : 'Save draft'}
                        </button>
                        {form._id && (
                            <button onClick={() => setForm(EMPTY_CAMPAIGN)} className="text-xs px-4 py-2 border border-borderColor rounded-full hover:bg-baseColor cursor-pointer">
                                Cancel edit
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* History */}
            <div className="border border-borderColor rounded-md overflow-hidden">
                <div className="bg-borderColor/40 px-4 py-2 border-b border-borderColor">
                    <h3 className="text-sm font-medium text-textColor">Campaigns</h3>
                </div>
                <div className="divide-y divide-borderColor">
                    {campaigns.length === 0 && <p className="text-xs text-lightColor p-4">No campaigns yet.</p>}
                    {campaigns.map((c) => (
                        <div key={c._id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-xs font-semibold text-textColor truncate">{c.subject}</p>
                                    <Badge status={c.status} />
                                </div>
                                <p className="text-[11px] text-lightColor mt-0.5">
                                    {c.status === 'sent' && c.sentAt ? `Sent ${new Date(c.sentAt).toLocaleString()} · ` : ''}
                                    {c.status === 'scheduled' && c.scheduledFor ? `Scheduled ${new Date(c.scheduledFor).toLocaleString()} · ` : ''}
                                    {c.counts?.sent || 0} sent · {c.stats?.open || 0} opens · {c.stats?.click || 0} clicks
                                    {c.counts?.failed ? ` · ${c.counts.failed} failed` : ''}
                                </p>
                                {c.lastError && <p className="text-[11px] text-red-500 truncate">{c.lastError}</p>}
                            </div>
                            <div className="flex gap-2 shrink-0">
                                {['draft', 'scheduled'].includes(c.status) && (
                                    <>
                                        <button
                                            onClick={() => setForm({
                                                _id: c._id,
                                                subject: c.subject,
                                                intro: c.intro || '',
                                                articleIds: (c.articleIds || []).map(String),
                                                audience: { type: c.audience?.type || 'all', interestIds: (c.audience?.interestIds || []).map(String) },
                                                scheduledFor: c.scheduledFor ? toDatetimeLocal(c.scheduledFor) : '',
                                            })}
                                            className="text-[11px] px-3 py-1 border border-borderColor rounded-full hover:bg-baseColor cursor-pointer"
                                        >
                                            Edit
                                        </button>
                                        <button onClick={() => sendNow(c._id)} disabled={busy} className="text-[11px] px-3 py-1 bg-textColor text-background rounded-full hover:bg-textColor/90 cursor-pointer disabled:opacity-50">
                                            Send now
                                        </button>
                                    </>
                                )}
                                <button onClick={() => duplicate(c._id)} className="text-[11px] px-3 py-1 border border-borderColor rounded-full hover:bg-baseColor cursor-pointer">
                                    Duplicate
                                </button>
                                {c.status !== 'sending' && (
                                    <button onClick={() => remove(c._id)} className="text-[11px] px-3 py-1 border border-red-200 text-red-500 rounded-full hover:bg-red-50 cursor-pointer">
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function Subscribers({ showToast }) {
    const [subscribers, setSubscribers] = useState([])
    const [interests, setInterests] = useState([])
    const [filter, setFilter] = useState('')

    const load = async (interestId = '') => {
        const qs = interestId ? `?interestId=${encodeURIComponent(interestId)}` : ''
        const [s, i] = await Promise.all([
            fetch(`/api/admin/newsletter/subscribers${qs}`).then((r) => r.json()).catch(() => ({})),
            fetch('/api/admin/newsletter/interests').then((r) => r.json()).catch(() => ({})),
        ])
        setSubscribers(s.subscribers || [])
        setInterests(i.interests || [])
    }
    useEffect(() => { load() }, [])

    const interestName = Object.fromEntries(interests.map((i) => [String(i._id), i.name]))

    return (
        <div className="border border-borderColor rounded-md overflow-hidden">
            <div className="bg-borderColor/40 px-4 py-2 border-b border-borderColor flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium text-textColor">Subscribers ({subscribers.length})</h3>
                <div className="flex items-center gap-2">
                    <select
                        value={filter}
                        onChange={(e) => { setFilter(e.target.value); load(e.target.value) }}
                        className="text-xs border border-borderColor rounded px-2 py-1 bg-background cursor-pointer"
                    >
                        <option value="">All interests</option>
                        {interests.map((i) => <option key={i._id} value={String(i._id)}>{i.name}</option>)}
                    </select>
                    <a
                        href={`/api/admin/newsletter/subscribers/export${filter ? `?interestId=${encodeURIComponent(filter)}` : ''}`}
                        className="text-xs px-3 py-1 border border-borderColor rounded-full hover:bg-baseColor cursor-pointer"
                    >
                        Export .xlsx
                    </a>
                </div>
            </div>
            <div className="divide-y divide-borderColor max-h-[50vh] overflow-y-auto">
                {subscribers.length === 0 && <p className="text-xs text-lightColor p-4">No subscribers yet.</p>}
                {subscribers.map((s) => (
                    <div key={s.email} className="px-4 py-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                            <p className="text-xs text-textColor truncate">{s.email}{s.fullName ? ` — ${s.fullName}` : ''}</p>
                            <p className="text-[11px] text-lightColor truncate">
                                {(s.interestIds || []).map((id) => interestName[id] || '').filter(Boolean).join(', ') || 'No topics'}
                            </p>
                        </div>
                        <span className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full border ${s.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                            {s.status}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}

function Welcome({ showToast }) {
    const [sequence, setSequence] = useState(null)

    useEffect(() => {
        fetch('/api/admin/newsletter/welcome-sequence')
            .then((r) => r.json())
            .then((d) => setSequence(d.sequence || { isActive: false, steps: [] }))
            .catch(() => setSequence({ isActive: false, steps: [] }))
    }, [])

    if (!sequence) return null

    const updateStep = (i, patch) =>
        setSequence((s) => ({ ...s, steps: s.steps.map((st, idx) => (idx === i ? { ...st, ...patch } : st)) }))

    const save = async () => {
        const res = await fetch('/api/admin/newsletter/welcome-sequence', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sequence),
        })
        showToast(res.ok ? 'Welcome sequence saved' : 'Save failed', res.ok ? 'success' : 'error')
    }

    return (
        <div className="border border-borderColor rounded-md overflow-hidden">
            <div className="bg-borderColor/40 px-4 py-2 border-b border-borderColor flex items-center justify-between">
                <h3 className="text-sm font-medium text-textColor">Welcome drip</h3>
                <label className="flex items-center gap-2 text-xs">
                    <input type="checkbox" checked={sequence.isActive} onChange={(e) => setSequence((s) => ({ ...s, isActive: e.target.checked }))} />
                    Active
                </label>
            </div>
            <div className="p-4 flex flex-col gap-4">
                <p className="text-xs text-lightColor">
                    Emails sent automatically to new subscribers. Delay is in days after the previous step (0 = immediately).
                </p>
                {sequence.steps.map((step, i) => (
                    <div key={i} className="border border-borderColor rounded-md p-3 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] text-lightColor">Step {i + 1} · after</span>
                            <input
                                type="number" min="0" className="formInput text-xs w-16"
                                value={step.delayDays}
                                onChange={(e) => updateStep(i, { delayDays: e.target.value })}
                            />
                            <span className="text-[11px] text-lightColor">days</span>
                            <button
                                onClick={() => setSequence((s) => ({ ...s, steps: s.steps.filter((_, idx) => idx !== i) }))}
                                className="text-[11px] text-red-500 ml-auto cursor-pointer"
                            >
                                Remove
                            </button>
                        </div>
                        <input className="formInput text-sm" placeholder="Subject" value={step.subject} onChange={(e) => updateStep(i, { subject: e.target.value })} />
                        <textarea className="formInput text-sm" rows={3} placeholder="Body (blank line = new paragraph)" value={step.body} onChange={(e) => updateStep(i, { body: e.target.value })} />
                    </div>
                ))}
                <div className="flex gap-2">
                    <button
                        onClick={() => setSequence((s) => ({ ...s, steps: [...s.steps, { delayDays: s.steps.length ? 3 : 0, subject: '', body: '' }] }))}
                        className="text-xs px-4 py-2 border border-borderColor rounded-full hover:bg-baseColor cursor-pointer"
                    >
                        + Add step
                    </button>
                    <button onClick={save} className="text-xs px-4 py-2 bg-textColor text-background rounded-full hover:bg-textColor/90 cursor-pointer">
                        Save sequence
                    </button>
                </div>
            </div>
        </div>
    )
}

function Interests({ showToast }) {
    const [interests, setInterests] = useState([])
    const [name, setName] = useState('')

    const load = () => fetch('/api/admin/newsletter/interests').then((r) => r.json()).then((d) => setInterests(d.interests || []))
    useEffect(() => { load() }, [])

    const add = async () => {
        if (!name.trim()) return
        await fetch('/api/admin/newsletter/interests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name.trim() }),
        })
        setName('')
        load()
    }

    const remove = async (id) => {
        if (!confirm('Delete this interest? Subscribers keep their other topics.')) return
        await fetch('/api/admin/newsletter/interests', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ _id: id }),
        })
        load()
    }

    return (
        <div className="border border-borderColor rounded-md overflow-hidden">
            <div className="bg-borderColor/40 px-4 py-2 border-b border-borderColor">
                <h3 className="text-sm font-medium text-textColor">Interests (segmentation topics)</h3>
            </div>
            <div className="p-4 flex flex-col gap-3">
                <div className="flex gap-2">
                    <input className="formInput text-sm flex-1" placeholder="e.g. 3D printing tips" value={name} onChange={(e) => setName(e.target.value)} />
                    <button onClick={add} className="text-xs px-4 py-2 bg-textColor text-background rounded-full hover:bg-textColor/90 cursor-pointer">Add</button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {interests.map((i) => (
                        <span key={i._id} className="flex items-center gap-2 text-xs px-3 py-1 border border-borderColor rounded-full">
                            {i.name}
                            <button onClick={() => remove(i._id)} className="text-red-500 cursor-pointer" title="Delete">×</button>
                        </span>
                    ))}
                    {interests.length === 0 && <p className="text-[11px] text-lightColor">No interests yet — campaigns go to everyone.</p>}
                </div>
            </div>
        </div>
    )
}

const SECTIONS = [
    { key: 'campaigns', label: 'Campaigns', component: Campaigns },
    { key: 'subscribers', label: 'Subscribers', component: Subscribers },
    { key: 'welcome', label: 'Welcome drip', component: Welcome },
    { key: 'interests', label: 'Interests', component: Interests },
]

export default function NewsletterManagement() {
    const { showToast } = useToast()
    const [section, setSection] = useState('campaigns')
    const Active = SECTIONS.find((s) => s.key === section)?.component || Campaigns

    return (
        <div className="flex flex-col gap-4 p-6 md:p-12">
            <div>
                <h2 className="text-lg font-semibold text-textColor mb-1">Newsletter</h2>
                <p className="text-xs text-lightColor">
                    Compose and send campaigns from published blog posts, manage subscribers,
                    and configure the welcome drip. Sending runs through the scheduled dispatcher.
                </p>
            </div>
            <div className="flex gap-1">
                {SECTIONS.map((s) => (
                    <button
                        key={s.key}
                        onClick={() => setSection(s.key)}
                        className={`px-3 py-1.5 rounded-full text-xs border border-borderColor cursor-pointer ${section === s.key ? 'bg-textColor text-background' : 'text-lightColor hover:bg-borderColor/20'}`}
                    >
                        {s.label}
                    </button>
                ))}
            </div>
            <Active showToast={showToast} />
        </div>
    )
}
