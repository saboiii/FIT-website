'use client'
import { useState } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts'
import { IoChevronDownOutline, IoChevronForwardOutline } from 'react-icons/io5'
import { buildSetupChecklist, summarizeRequests } from '@/lib/admin/setupChecklist'
import AnalyticsPanel from '@/components/Admin/AnalyticsPanel'
import {
    DashCard,
    StatTile,
    StatusPill,
    Sheet,
    EmptyState,
    FreshnessStamp,
    SkeletonTile,
} from '@/components/dashboard-ui'

const STATUS_LABELS = {
    pending_upload: 'Awaiting upload',
    pending_config: 'Awaiting config',
    configured: 'Awaiting quote',
    quoted: 'Quoted',
    payment_pending: 'Payment pending',
    paid: 'Paid',
    printing: 'Printing',
    printed: 'Printed',
    shipped: 'Shipped',
}

// Checklist collapses to its header once most of it is done (§5.7).
const CHECKLIST_COLLAPSE_AT = 5

// Chart tokens per §4.7: 2px ink line, sun-soft fill, x-labels only at 11px
// ink-faint, no gridlines/legend/axis boxes.
const CHART_INK = '#111111'
const CHART_LABEL = '#a6a399'
const tooltipStyle = {
    fontSize: 11,
    border: '1px solid var(--dash-line)',
    borderRadius: 8,
    background: 'var(--dash-card)',
    boxShadow: 'var(--dash-shadow-card)',
}

/** Requests grouped per day over the trailing window — client-side (§9.9). */
function requestsPerDay(requests, days = 30) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const buckets = new Map()
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(today.getDate() - i)
        buckets.set(d.toDateString(), {
            label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
            requests: 0,
        })
    }
    let total = 0
    for (const r of requests || []) {
        if (!r?.createdAt) continue
        const d = new Date(r.createdAt)
        if (Number.isNaN(d.getTime())) continue
        d.setHours(0, 0, 0, 0)
        const bucket = buckets.get(d.toDateString())
        if (bucket) {
            bucket.requests += 1
            total += 1
        }
    }
    return { data: [...buckets.values()], total }
}

function AdminEmailSheet({ open, onClose }) {
    const [copied, setCopied] = useState(false)
    const snippet = 'ADMIN_EMAIL=you@yourstore.com\nGMAIL_USER=you@gmail.com'
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(snippet)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch { /* clipboard unavailable — the text is selectable */ }
    }
    return (
        <Sheet open={open} onClose={onClose} label="Set the admin notification email">
            <div className="p-6 flex flex-col gap-3">
                <h3 className="dash-section">Set the Admin Notification Email</h3>
                <p className="text-[13px] dash-soft">
                    This one lives outside the dashboard: it&apos;s an environment variable, so it&apos;s
                    set where the app runs. Add either line to your <code className="dash-data">.env.local</code>{' '}
                    file (or your hosting provider&apos;s environment settings), then restart the app.
                </p>
                <pre className="dash-data bg-[var(--dash-card)] border border-[var(--dash-line)] rounded-[var(--dash-r-inner)] p-4 overflow-x-auto whitespace-pre">
                    {snippet}
                </pre>
                <p className="text-[13px] dash-soft">
                    <code className="dash-data">ADMIN_EMAIL</code> wins when both are set;{' '}
                    <code className="dash-data">GMAIL_USER</code> doubles as the sending account.
                    New print requests will email that address.
                </p>
                <div className="flex items-center gap-3 mt-1">
                    <button
                        onClick={copy}
                        className="dash-hoverable rounded-full px-4 py-2 text-[13px] font-medium bg-[var(--dash-sun)] text-[var(--dash-ink)] cursor-pointer hover:bg-[var(--dash-sun-deep)]"
                    >
                        {copied ? 'Copied' : 'Copy Snippet'}
                    </button>
                    <button onClick={onClose} className="text-[13px] dash-soft hover:text-[var(--dash-ink)] cursor-pointer">
                        Done
                    </button>
                </div>
            </div>
        </Sheet>
    )
}

// Pure-render panel: the page owns the data (it also drives the wizard trigger).
export default function Overview({ setupData, requests, fetchedAt, onNavigate, onOpenWizard }) {
    const [checklistExpanded, setChecklistExpanded] = useState(false)
    const [emailSheetOpen, setEmailSheetOpen] = useState(false)

    if (!setupData) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SkeletonTile />
                <SkeletonTile />
                <SkeletonTile />
            </div>
        )
    }

    const items = buildSetupChecklist(setupData)
    const done = items.filter((i) => i.ok).length
    const summary = summarizeRequests(requests)
    const collapsible = done >= CHECKLIST_COLLAPSE_AT
    const showRows = !collapsible || checklistExpanded
    const activity = requestsPerDay(requests)

    const fixNow = (item) => {
        // The env-var row can't be fixed by any tab — explain instead (§5.7).
        if (item.key === 'adminEmail') setEmailSheetOpen(true)
        else onNavigate(item.tab)
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-baseline justify-between gap-3">
                <h2 className="dash-title">Overview</h2>
                <FreshnessStamp at={fetchedAt} />
            </div>

            {/* Hero cluster (§5.7/§9.9): the ink tile is the view's ONE black
                element; the quote tile claims the sun ONLY when it needs you. */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatTile
                    label="Open print requests"
                    value={summary.openTotal}
                    hint="all active jobs"
                    variant="ink"
                    onClick={() => onNavigate('customPrintRequests')}
                    actionLabel="Open queue"
                />
                <StatTile
                    label="Awaiting your quote"
                    value={summary.unquoted}
                    hint="needs a price from you"
                    variant={summary.unquoted > 0 ? 'sun' : 'paper'}
                    onClick={() => onNavigate('customPrintRequests', 'needs_quote')}
                    actionLabel="Open queue"
                />
                <StatTile
                    label="Paid, not printing"
                    value={summary.paidNotPrinted}
                    hint="ready for the printer"
                    variant="paper"
                    onClick={() => onNavigate('customPrintRequests', 'paid')}
                    actionLabel="Open queue"
                />
            </div>
            {summary.openTotal > 0 && (
                <div className="flex flex-wrap gap-2">
                    {Object.entries(summary.openByStatus).map(([status, count]) => (
                        <StatusPill key={status} tone="paper">
                            {STATUS_LABELS[status] || status}:{' '}
                            <span className="dash-data text-[var(--dash-ink)]">{count}</span>
                        </StatusPill>
                    ))}
                </div>
            )}

            {/* Setup checklist — collapses to its header row once ≥5 done. */}
            <DashCard
                title={
                    collapsible ? (
                        <button
                            onClick={() => setChecklistExpanded((e) => !e)}
                            aria-expanded={checklistExpanded}
                            className="dash-section flex items-center gap-2 cursor-pointer"
                        >
                            Store setup — {done}/{items.length} complete
                            {checklistExpanded ? (
                                <IoChevronDownOutline size={14} className="text-[var(--dash-ink-soft)]" aria-hidden />
                            ) : (
                                <IoChevronForwardOutline size={14} className="text-[var(--dash-ink-soft)]" aria-hidden />
                            )}
                        </button>
                    ) : (
                        <>Store setup — {done}/{items.length} complete</>
                    )
                }
                action={
                    <button
                        onClick={onOpenWizard}
                        className="dash-hoverable text-[12px] px-3 py-1 border border-[var(--dash-line)] rounded-full text-[var(--dash-ink-soft)] hover:text-[var(--dash-ink)] hover:bg-[var(--dash-sun-soft)] cursor-pointer whitespace-nowrap"
                    >
                        Run setup wizard
                    </button>
                }
            >
                {showRows ? (
                    <div className="divide-y divide-[var(--dash-line)]">
                        {items.map((item) => (
                            <div key={item.key} className="flex items-start gap-3 py-3 first:pt-1 last:pb-1">
                                {item.ok ? (
                                    <span className="mt-0.5 text-[13px]" style={{ color: 'var(--dash-ok)' }} aria-hidden>
                                        ✓
                                    </span>
                                ) : (
                                    <span
                                        className="dash-hatch mt-1.5 inline-block h-3 w-3 shrink-0 rounded-full border border-[var(--dash-line)]"
                                        aria-hidden
                                    />
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-[14px]">{item.label}</p>
                                    {!item.ok && <p className="text-[12px] dash-soft mt-0.5">{item.consequence}</p>}
                                </div>
                                {!item.ok && (
                                    <button
                                        onClick={() => fixNow(item)}
                                        className="dash-hoverable text-[12px] px-3 py-1 border border-[var(--dash-line)] rounded-full text-[var(--dash-ink-soft)] hover:text-[var(--dash-ink)] hover:bg-[var(--dash-sun-soft)] whitespace-nowrap cursor-pointer"
                                    >
                                        Fix now
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-[13px] dash-soft">
                        {done === items.length
                            ? 'Everything is configured.'
                            : `${items.length - done} item${items.length - done === 1 ? '' : 's'} left — expand to see what and why.`}
                    </p>
                )}
            </DashCard>

            {/* Requests activity (§9.9) — computed client-side from the fetched list. */}
            <DashCard title="Requests — 30 days">
                {activity.total === 0 ? (
                    <EmptyState
                        title="No Requests Yet"
                        body="New print requests will chart here day by day as they arrive."
                        className="py-8"
                    />
                ) : (
                    <ResponsiveContainer width="100%" height={160}>
                        <AreaChart data={activity.data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
                            <XAxis
                                dataKey="label"
                                tick={{ fontSize: 11, fill: CHART_LABEL }}
                                tickLine={false}
                                axisLine={false}
                                minTickGap={32}
                            />
                            <Tooltip
                                contentStyle={tooltipStyle}
                                labelStyle={{ color: 'var(--dash-ink-soft)' }}
                                cursor={{ stroke: 'var(--dash-line)' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="requests"
                                stroke={CHART_INK}
                                strokeWidth={2}
                                fill="var(--dash-sun-soft)"
                                fillOpacity={1}
                                dot={false}
                                activeDot={{ r: 4, fill: CHART_INK, strokeWidth: 0 }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </DashCard>

            {/* Site analytics, demoted (§5.7): tiles + traffic line by default,
                the rest behind the panel's own "Full analytics" disclosure. */}
            <AnalyticsPanel compact />

            <AdminEmailSheet open={emailSheetOpen} onClose={() => setEmailSheetOpen(false)} />
        </div>
    )
}
