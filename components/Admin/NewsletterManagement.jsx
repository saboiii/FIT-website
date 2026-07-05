'use client'
import { useEffect, useState } from 'react'
import { useToast } from '@/components/General/ToastProvider'
import { toDatetimeLocal } from '@/utils/datetimeLocal'
import { DashCard, ViewTabs, GlassBar, StatusPill, ConfirmDialog, FreshnessStamp } from '@/components/dashboard-ui'
import { inputCls, labelCls, quietBtnCls, badTextBtnCls, DashSelect } from '@/components/DashboardComponents/ProductFormFields/dashFormUi'

const EMPTY_CAMPAIGN = { subject: '', intro: '', articleIds: [], audience: { type: 'all', interestIds: [] }, scheduledFor: '' }

// Status vocabulary (§5.13): sending = sun (happening now), sent = ok,
// scheduled = hatch (pending), failed = bad, draft = paper.
const STATUS_TONES = {
    sending: 'sun',
    sent: 'ok',
    scheduled: 'hatch',
    failed: 'bad',
    draft: 'paper',
}

const sunBtnCls =
    'dash-hoverable rounded-full px-4 py-1.5 text-[13px] font-medium bg-[var(--dash-sun)] text-[var(--dash-ink)] cursor-pointer hover:bg-[var(--dash-sun-deep)] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed'

const inkBtnCls =
    'dash-hoverable rounded-full px-3.5 py-1.5 text-[13px] font-medium bg-[var(--dash-ink)] text-[var(--dash-canvas)] cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed'

const thumbSrc = (heroImage) => {
    if (!heroImage) return null
    if (heroImage.startsWith('http://') || heroImage.startsWith('https://') || heroImage.startsWith('/')) return heroImage
    return `/api/proxy?key=${encodeURIComponent(heroImage)}`
}

function Campaigns({ showToast }) {
    const [campaigns, setCampaigns] = useState([])
    const [posts, setPosts] = useState([])
    const [interests, setInterests] = useState([])
    const [form, setForm] = useState(EMPTY_CAMPAIGN)
    const [busy, setBusy] = useState(false)
    const [fetchedAt, setFetchedAt] = useState(null)
    const [confirmSendId, setConfirmSendId] = useState(null)
    const [confirmDeleteId, setConfirmDeleteId] = useState(null)

    const load = async () => {
        const [c, p, i] = await Promise.all([
            fetch('/api/admin/newsletter').then((r) => r.json()).catch(() => ({})),
            fetch('/api/admin/blog').then((r) => r.json()).catch(() => ({})),
            fetch('/api/admin/newsletter/interests').then((r) => r.json()).catch(() => ({})),
        ])
        setCampaigns(c.campaigns || [])
        setPosts((p.posts || []).filter((x) => x.published))
        setInterests(i.interests || [])
        setFetchedAt(Date.now())
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
            setConfirmSendId(null)
        }
    }

    const duplicate = async (id) => {
        await fetch(`/api/admin/newsletter/${id}/duplicate`, { method: 'POST' })
        load()
    }

    const remove = async (id) => {
        await fetch('/api/admin/newsletter', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ _id: id }),
        })
        setConfirmDeleteId(null)
        load()
    }

    const toggleArticle = (id) => {
        setForm((f) => ({
            ...f,
            articleIds: f.articleIds.includes(id) ? f.articleIds.filter((x) => x !== id) : [...f.articleIds, id],
        }))
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Save / Schedule cluster — pinned above the composer (§5.13) */}
            <GlassBar className="justify-between">
                <span className="text-[13px] dash-soft">
                    {form._id ? 'Editing campaign' : 'New campaign'}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                    {form._id && (
                        <button onClick={() => setForm(EMPTY_CAMPAIGN)} className={quietBtnCls}>
                            Cancel edit
                        </button>
                    )}
                    {/* Honest stub (openspec add-newsletter-test-send): no test-send endpoint yet. */}
                    <button
                        type="button"
                        disabled
                        title="Send test to me — coming soon"
                        className={quietBtnCls}
                    >
                        Send test to me
                    </button>
                    <button onClick={() => saveCampaign()} disabled={busy} className={sunBtnCls}>
                        {form.scheduledFor ? 'Save & schedule' : 'Save draft'}
                    </button>
                </div>
            </GlassBar>

            {/* Composer — document lite */}
            <DashCard>
                <div className="flex flex-col gap-4">
                    <input
                        aria-label="Subject"
                        placeholder="Campaign subject…"
                        value={form.subject}
                        onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                        className="w-full bg-transparent text-[24px] font-semibold tracking-[-0.01em] text-[var(--dash-ink)] border-0 border-b border-[var(--dash-line)] pb-2 focus:outline-none"
                    />
                    <div className="flex flex-col gap-1.5">
                        <label className={labelCls}>Intro</label>
                        <textarea
                            className={inputCls()}
                            rows={2}
                            placeholder="A short greeting above the articles (optional)"
                            value={form.intro}
                            onChange={(e) => setForm((f) => ({ ...f, intro: e.target.value }))}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className={labelCls}>Articles ({form.articleIds.length} selected)</label>
                        {posts.length === 0 && <p className="text-[13px] dash-soft">No published posts yet.</p>}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {posts.map((p) => {
                                const checked = form.articleIds.includes(p._id)
                                const src = thumbSrc(p.heroImage)
                                return (
                                    <label
                                        key={p._id}
                                        className={`dash-hoverable flex items-center gap-3 p-2.5 rounded-[var(--dash-r-inner)] border border-[var(--dash-line)] cursor-pointer ${checked ? 'bg-[var(--dash-sun-soft)]' : 'bg-[var(--dash-card)] hover:bg-[var(--dash-canvas)]'}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleArticle(p._id)}
                                            className="accent-[var(--dash-ink)] cursor-pointer"
                                        />
                                        {src ? (
                                            <img
                                                src={src}
                                                alt=""
                                                className="w-10 h-10 object-cover rounded-[var(--dash-r-inner)] border border-[var(--dash-line)] shrink-0"
                                            />
                                        ) : (
                                            <span aria-hidden="true" className="dash-hatch w-10 h-10 rounded-[var(--dash-r-inner)] border border-[var(--dash-line)] bg-[var(--dash-card)] shrink-0" />
                                        )}
                                        <span className="text-[13px] font-medium text-[var(--dash-ink)] truncate">{p.title}</span>
                                    </label>
                                )
                            })}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className={labelCls}>Audience</label>
                        <div className="flex flex-wrap items-center gap-3">
                            <label className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                                <input
                                    type="radio"
                                    className="accent-[var(--dash-ink)] cursor-pointer"
                                    checked={form.audience.type === 'all'}
                                    onChange={() => setForm((f) => ({ ...f, audience: { ...f.audience, type: 'all' } }))}
                                />
                                All subscribers
                            </label>
                            <label className="flex items-center gap-1.5 text-[13px] cursor-pointer">
                                <input
                                    type="radio"
                                    className="accent-[var(--dash-ink)] cursor-pointer"
                                    checked={form.audience.type === 'interests'}
                                    onChange={() => setForm((f) => ({ ...f, audience: { ...f.audience, type: 'interests' } }))}
                                />
                                By interest
                            </label>
                            {form.audience.type === 'interests' && interests.map((i) => {
                                const id = String(i._id)
                                const on = form.audience.interestIds.includes(id)
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        aria-pressed={on}
                                        onClick={() => setForm((f) => {
                                            const ids = f.audience.interestIds.includes(id)
                                                ? f.audience.interestIds.filter((x) => x !== id)
                                                : [...f.audience.interestIds, id]
                                            return { ...f, audience: { ...f.audience, interestIds: ids } }
                                        })}
                                        className={`dash-hoverable rounded-full px-3 py-1 text-[13px] border border-[var(--dash-line)] cursor-pointer ${on ? 'bg-[var(--dash-sun-soft)] text-[var(--dash-ink)] font-medium' : 'bg-[var(--dash-card)] text-[var(--dash-ink-soft)] hover:bg-[var(--dash-canvas)]'}`}
                                    >
                                        {i.name}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5 max-w-xs">
                        <label className={labelCls} htmlFor="newsletter-schedule">Schedule (optional — empty saves a draft)</label>
                        <input
                            id="newsletter-schedule"
                            type="datetime-local"
                            className={inputCls()}
                            value={form.scheduledFor}
                            onChange={(e) => setForm((f) => ({ ...f, scheduledFor: e.target.value }))}
                        />
                    </div>
                </div>
            </DashCard>

            {/* History — ledger rows, one StatusPill per row */}
            <DashCard title="Campaigns" action={<FreshnessStamp at={fetchedAt} />}>
                <div className="divide-y divide-[var(--dash-line)]">
                    {campaigns.length === 0 && <p className="text-[13px] dash-soft py-2">No campaigns yet.</p>}
                    {campaigns.map((c) => (
                        <div key={c._id} className="py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-[13px] font-medium text-[var(--dash-ink)] truncate">{c.subject}</p>
                                    <StatusPill tone={STATUS_TONES[c.status] || 'paper'}>{c.status}</StatusPill>
                                </div>
                                <p className="dash-data dash-soft mt-0.5">
                                    {c.status === 'sent' && c.sentAt ? `Sent ${new Date(c.sentAt).toLocaleString()} · ` : ''}
                                    {c.status === 'scheduled' && c.scheduledFor ? `Scheduled ${new Date(c.scheduledFor).toLocaleString()} · ` : ''}
                                    {c.counts?.sent || 0} sent · {c.stats?.open || 0} opens · {c.stats?.click || 0} clicks
                                    {c.counts?.failed ? ` · ${c.counts.failed} failed` : ''}
                                </p>
                                {c.lastError && <p className="text-[13px] text-[var(--dash-bad)] truncate">{c.lastError}</p>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
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
                                            className={quietBtnCls}
                                        >
                                            Edit
                                        </button>
                                        <button onClick={() => setConfirmSendId(c._id)} disabled={busy} className={inkBtnCls}>
                                            Send now
                                        </button>
                                    </>
                                )}
                                <button onClick={() => duplicate(c._id)} className={quietBtnCls}>
                                    Duplicate
                                </button>
                                {c.status !== 'sending' && (
                                    <button onClick={() => setConfirmDeleteId(c._id)} className={badTextBtnCls}>
                                        Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </DashCard>

            <ConfirmDialog
                open={confirmSendId !== null}
                onClose={() => setConfirmSendId(null)}
                onConfirm={() => sendNow(confirmSendId)}
                title="Send campaign"
                body="Send this campaign to its audience now?"
                confirmLabel="Send now"
                busy={busy}
            />
            <ConfirmDialog
                open={confirmDeleteId !== null}
                onClose={() => setConfirmDeleteId(null)}
                onConfirm={() => remove(confirmDeleteId)}
                title="Delete campaign"
                body="This permanently deletes the campaign. Sent statistics are lost."
                confirmLabel="Delete"
                tone="bad"
            />
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
        <DashCard
            title={`Subscribers (${subscribers.length})`}
            action={(
                <div className="flex items-center gap-2">
                    <DashSelect
                        name="subscriber-interest-filter"
                        value={filter}
                        onChangeFunction={(e) => { setFilter(e.target.value); load(e.target.value) }}
                        options={[
                            { value: '', label: 'All interests' },
                            ...interests.map((i) => ({ value: String(i._id), label: i.name })),
                        ]}
                        className="w-40"
                    />
                    <a
                        href={`/api/admin/newsletter/subscribers/export${filter ? `?interestId=${encodeURIComponent(filter)}` : ''}`}
                        className={quietBtnCls}
                    >
                        Export .xlsx
                    </a>
                </div>
            )}
        >
            <div className="divide-y divide-[var(--dash-line)] max-h-[50vh] dash-scroll">
                {subscribers.length === 0 && <p className="text-[13px] dash-soft py-2">No subscribers yet.</p>}
                {subscribers.map((s) => (
                    <div key={s.email} className="py-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                            <p className="text-[13px] text-[var(--dash-ink)] truncate">{s.email}{s.fullName ? ` — ${s.fullName}` : ''}</p>
                            <p className="dash-data dash-soft truncate">
                                {(s.interestIds || []).map((id) => interestName[id] || '').filter(Boolean).join(', ') || 'No topics'}
                            </p>
                        </div>
                        <StatusPill tone={s.status === 'active' ? 'ok' : 'paper'}>{s.status}</StatusPill>
                    </div>
                ))}
            </div>
        </DashCard>
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
        <div className="flex flex-col gap-4">
            <DashCard
                title="Welcome drip"
                action={(
                    <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                        <input
                            type="checkbox"
                            className="accent-[var(--dash-ink)] cursor-pointer"
                            checked={sequence.isActive}
                            onChange={(e) => setSequence((s) => ({ ...s, isActive: e.target.checked }))}
                        />
                        Active
                    </label>
                )}
            >
                <p className="text-[13px] dash-soft">
                    Emails sent automatically to new subscribers. Delay is in days after the previous step (0 = immediately).
                </p>
            </DashCard>

            {sequence.steps.map((step, i) => (
                <DashCard
                    key={i}
                    title={`Step ${i + 1}`}
                    action={(
                        <button
                            onClick={() => setSequence((s) => ({ ...s, steps: s.steps.filter((_, idx) => idx !== i) }))}
                            className={badTextBtnCls}
                        >
                            Remove
                        </button>
                    )}
                >
                    <div className="flex flex-col gap-2.5">
                        <div className="flex items-center gap-2">
                            <span className="text-[13px] dash-soft">Send after</span>
                            <input
                                type="number" min="0"
                                className={`${inputCls()} w-16 text-right dash-data`}
                                aria-label={`Step ${i + 1} delay in days`}
                                value={step.delayDays}
                                onChange={(e) => updateStep(i, { delayDays: e.target.value })}
                            />
                            <span className="text-[13px] dash-soft">days</span>
                        </div>
                        <input
                            className={inputCls()}
                            placeholder="Subject"
                            value={step.subject}
                            onChange={(e) => updateStep(i, { subject: e.target.value })}
                        />
                        <textarea
                            className={inputCls()}
                            rows={3}
                            placeholder="Body (blank line = new paragraph)"
                            value={step.body}
                            onChange={(e) => updateStep(i, { body: e.target.value })}
                        />
                    </div>
                </DashCard>
            ))}

            <div className="flex gap-2">
                <button
                    onClick={() => setSequence((s) => ({ ...s, steps: [...s.steps, { delayDays: s.steps.length ? 3 : 0, subject: '', body: '' }] }))}
                    className={quietBtnCls}
                >
                    + Add step
                </button>
                <button onClick={save} className={inkBtnCls}>
                    Save sequence
                </button>
            </div>
        </div>
    )
}

function Interests({ showToast }) {
    const [interests, setInterests] = useState([])
    const [name, setName] = useState('')
    const [confirmDeleteId, setConfirmDeleteId] = useState(null)

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
        await fetch('/api/admin/newsletter/interests', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ _id: id }),
        })
        setConfirmDeleteId(null)
        load()
    }

    return (
        <DashCard title="Interests (segmentation topics)">
            <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                    <input
                        className={`${inputCls()} flex-1`}
                        placeholder="e.g. 3D printing tips"
                        aria-label="New interest name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <button onClick={add} className={inkBtnCls}>Add</button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {interests.map((i) => (
                        <span key={i._id} className="flex items-center gap-2 text-[13px] px-3 py-1 border border-[var(--dash-line)] rounded-full bg-[var(--dash-card)]">
                            {i.name}
                            <button
                                onClick={() => setConfirmDeleteId(i._id)}
                                className="text-[var(--dash-bad)] cursor-pointer hover:opacity-80"
                                title="Delete"
                                aria-label={`Delete interest ${i.name}`}
                            >
                                ×
                            </button>
                        </span>
                    ))}
                    {interests.length === 0 && <p className="text-[13px] dash-soft">No interests yet — campaigns go to everyone.</p>}
                </div>
            </div>
            <ConfirmDialog
                open={confirmDeleteId !== null}
                onClose={() => setConfirmDeleteId(null)}
                onConfirm={() => remove(confirmDeleteId)}
                title="Delete interest"
                body="Subscribers keep their other topics."
                confirmLabel="Delete"
                tone="bad"
            />
        </DashCard>
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
        <div className="flex flex-col gap-4 p-4 md:p-6">
            <div>
                <h2 className="dash-title">Newsletter</h2>
                <p className="text-[13px] dash-soft mt-1">
                    Compose and send campaigns from published blog posts, manage subscribers,
                    and configure the welcome drip. Sending runs through the scheduled dispatcher.
                </p>
            </div>
            <ViewTabs
                tabs={SECTIONS.map((s) => ({ key: s.key, label: s.label }))}
                active={section}
                onChange={setSection}
            />
            <Active showToast={showToast} />
        </div>
    )
}
