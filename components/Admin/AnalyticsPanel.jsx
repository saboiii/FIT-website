'use client'
import { useEffect, useState } from 'react'
import {
    ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip,
} from 'recharts'

// Chart tokens (validated against the light surface — see dataviz skill):
// single mark hue #d97706; text/axes wear text tokens, never the mark colour.
const MARK = '#d97706'
const INK_MUTED = '#67696b'
const GRID = '#e6e6e6'

const WINDOWS = [
    { key: 'last_24_hours', label: '24h' },
    { key: 'last_7_days', label: '7d' },
    { key: 'last_30_days', label: '30d' },
    { key: 'last_90_days', label: '90d' },
]

const tooltipStyle = {
    fontSize: 11,
    border: `1px solid ${GRID}`,
    borderRadius: 6,
    background: '#fefefe',
    boxShadow: 'none',
}

function StatTile({ label, value }) {
    return (
        <div className="border border-borderColor rounded-md p-4">
            <p className="text-2xl font-semibold text-textColor">{value}</p>
            <p className="text-xs text-lightColor mt-1">{label}</p>
        </div>
    )
}

function ProgressRows({ title, rows }) {
    const max = rows[0]?.count || 1
    return (
        <div className="border border-borderColor rounded-md p-4">
            <p className="text-xs font-medium text-textColor mb-3">{title}</p>
            {rows.length === 0 && <p className="text-[11px] text-lightColor">No data yet.</p>}
            <div className="flex flex-col gap-2">
                {rows.slice(0, 6).map((r) => (
                    <div key={r.name} className="flex items-center gap-2">
                        <span className="text-[11px] text-lightColor w-28 truncate" title={r.name}>{r.name}</span>
                        <div className="flex-1 h-2 bg-borderColor/40 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(r.count / max) * 100}%`, background: MARK }} />
                        </div>
                        <span className="text-[11px] text-textColor w-10 text-right">{r.count}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

function formatBucket(iso, window) {
    const d = new Date(iso)
    if (window === 'last_24_hours') return `${String(d.getUTCHours()).padStart(2, '0')}:00`
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function AnalyticsPanel() {
    const [windowKey, setWindowKey] = useState('last_7_days')
    const [state, setState] = useState({ loading: true })

    useEffect(() => {
        let cancelled = false
        setState((s) => ({ ...s, loading: true }))
        fetch(`/api/admin/analytics?window=${windowKey}`)
            .then((r) => r.json())
            .then((data) => { if (!cancelled) setState({ loading: false, ...data }) })
            .catch(() => { if (!cancelled) setState({ loading: false, error: true }) })
        return () => { cancelled = true }
    }, [windowKey])

    if (state.loading) {
        return (
            <div className="border border-borderColor rounded-md p-8 flex justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-textColor border-t-transparent" />
            </div>
        )
    }

    if (state.configured === false) {
        return (
            <div className="border border-borderColor rounded-md p-6">
                <p className="text-sm font-medium text-textColor mb-1">Analytics not connected</p>
                <p className="text-xs text-lightColor">
                    Create a PostHog project and set <code className="text-[11px]">NEXT_PUBLIC_POSTHOG_KEY</code>,{' '}
                    <code className="text-[11px]">POSTHOG_PROJECT_ID</code> and{' '}
                    <code className="text-[11px]">POSTHOG_PERSONAL_API_KEY</code> (optionally{' '}
                    <code className="text-[11px]">NEXT_PUBLIC_POSTHOG_HOST</code>) to see traffic here.
                </p>
            </div>
        )
    }

    if (state.error || !state.snapshot) {
        return (
            <div className="border border-borderColor rounded-md p-6">
                <p className="text-xs text-lightColor">Analytics is connected but the snapshot failed to load. Try refreshing.</p>
            </div>
        )
    }

    const snap = state.snapshot
    const series = snap.series.map((b) => ({ ...b, label: formatBucket(b.t, windowKey) }))
    const hourly = snap.hourlyActivity.map((views, hour) => ({ hour: `${hour}:00`, views }))

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-textColor">Traffic</h3>
                <div className="flex gap-1">
                    {WINDOWS.map((w) => (
                        <button
                            key={w.key}
                            onClick={() => setWindowKey(w.key)}
                            className={`px-2 py-1 rounded-full text-[10px] uppercase tracking-wide border border-borderColor cursor-pointer ${windowKey === w.key ? 'bg-textColor text-background' : 'text-lightColor hover:bg-borderColor/20'}`}
                        >
                            {w.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <StatTile label="Page views" value={snap.totalViews} />
                <StatTile label="Unique visitors" value={snap.uniqueVisitors} />
            </div>

            {/* Views over time (single series — the title names it, no legend) */}
            <div className="border border-borderColor rounded-md p-4">
                <p className="text-xs font-medium text-textColor mb-2">Views over time</p>
                <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={series} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                        <defs>
                            <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={MARK} stopOpacity={0.25} />
                                <stop offset="100%" stopColor={MARK} stopOpacity={0.02} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: INK_MUTED }} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={24} />
                        <YAxis tick={{ fontSize: 10, fill: INK_MUTED }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: INK_MUTED }} cursor={{ stroke: GRID }} />
                        <Area type="monotone" dataKey="views" stroke={MARK} strokeWidth={2} fill="url(#viewsFill)" dot={false} activeDot={{ r: 4 }} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Hourly activity */}
            <div className="border border-borderColor rounded-md p-4">
                <p className="text-xs font-medium text-textColor mb-2">Activity by hour (UTC)</p>
                <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={hourly} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                        <CartesianGrid stroke={GRID} strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="hour" tick={{ fontSize: 10, fill: INK_MUTED }} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={16} />
                        <YAxis tick={{ fontSize: 10, fill: INK_MUTED }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: INK_MUTED }} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                        <Bar dataKey="views" fill={MARK} radius={[4, 4, 0, 0]} maxBarSize={14} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ProgressRows title="Traffic sources" rows={snap.sources} />
                <ProgressRows title="Devices" rows={snap.devices} />
                <ProgressRows title="Browsers" rows={snap.browsers} />
                <ProgressRows title="Countries" rows={snap.countries} />
            </div>

            {/* Top articles */}
            <div className="border border-borderColor rounded-md overflow-hidden">
                <div className="bg-borderColor/40 px-4 py-2 border-b border-borderColor">
                    <p className="text-xs font-medium text-textColor">Top blog articles</p>
                </div>
                {snap.articles.length === 0 ? (
                    <p className="text-[11px] text-lightColor p-4">No article views in this window.</p>
                ) : (
                    <div className="divide-y divide-borderColor">
                        {snap.articles.slice(0, 8).map((a) => (
                            <div key={a.slug} className="flex items-center justify-between px-4 py-2">
                                <a href={`/blog/${encodeURIComponent(a.slug)}`} target="_blank" rel="noreferrer" className="text-xs text-textColor hover:underline truncate">
                                    {a.slug}
                                </a>
                                <span className="text-[11px] text-lightColor whitespace-nowrap ml-3">
                                    {a.views} views · ~{a.avgEngagedSeconds}s read
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
