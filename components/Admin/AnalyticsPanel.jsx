'use client'
import { useEffect, useState } from 'react'
import {
    ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, Tooltip,
} from 'recharts'
import { IoChevronDownOutline, IoChevronForwardOutline, IoPulseOutline } from 'react-icons/io5'
import { DashCard, StatTile, ViewTabs, EmptyState, SkeletonTile } from '@/components/dashboard-ui'

// Chart law (blueprint §4.7): single 2px ink line, sun-soft area fill,
// x-labels only at 11px ink-faint, no gridlines/legends/axis boxes.
const CHART_INK = '#111111'
const CHART_LABEL = '#a6a399'

const WINDOWS = [
    { key: 'last_24_hours', label: '24h' },
    { key: 'last_7_days', label: '7d' },
    { key: 'last_30_days', label: '30d' },
    { key: 'last_90_days', label: '90d' },
]

const WINDOW_HINTS = {
    last_24_hours: 'last 24 hours',
    last_7_days: 'last 7 days',
    last_30_days: 'last 30 days',
    last_90_days: 'last 90 days',
}

const tooltipStyle = {
    fontSize: 11,
    border: '1px solid var(--dash-line)',
    borderRadius: 8,
    background: 'var(--dash-card)',
    boxShadow: 'var(--dash-shadow-card)',
}

function ProgressRows({ title, rows }) {
    const max = rows[0]?.count || 1
    return (
        <DashCard title={title}>
            {rows.length === 0 && <p className="text-[12px] dash-soft">No data yet.</p>}
            <div className="flex flex-col gap-2">
                {rows.slice(0, 6).map((r) => (
                    <div key={r.name} className="flex items-center gap-2">
                        <span className="text-[12px] dash-soft w-28 truncate" title={r.name}>{r.name}</span>
                        <div className="flex-1 h-2 bg-[var(--dash-canvas)] rounded-full overflow-hidden">
                            <div
                                className="h-full rounded-full"
                                style={{ width: `${(r.count / max) * 100}%`, background: 'var(--dash-ink)' }}
                            />
                        </div>
                        <span className="dash-data w-10 text-right">{r.count}</span>
                    </div>
                ))}
            </div>
        </DashCard>
    )
}

function formatBucket(iso, window) {
    const d = new Date(iso)
    if (window === 'last_24_hours') return `${String(d.getUTCHours()).padStart(2, '0')}:00`
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

/**
 * PostHog traffic panel. `compact` (admin overview, §5.7) shows only the
 * visitors/views tiles + the views-over-time chart, with the breakdowns and
 * top-articles table behind a "Full analytics" disclosure. Default renders
 * everything (the pre-redesign behaviour).
 */
export default function AnalyticsPanel({ compact = false }) {
    const [windowKey, setWindowKey] = useState('last_7_days')
    const [state, setState] = useState({ loading: true })
    const [showFull, setShowFull] = useState(false)

    useEffect(() => {
        let cancelled = false
        setState((s) => ({ ...s, loading: true }))
        fetch(`/api/admin/analytics?window=${windowKey}`)
            .then((r) => r.json())
            .then((data) => { if (!cancelled) setState({ loading: false, ...data }) })
            .catch(() => { if (!cancelled) setState({ loading: false, error: true }) })
        return () => { cancelled = true }
    }, [windowKey])

    // Skeletons on true first load only (Law C5) — a window change keeps the
    // previous snapshot on screen while the new one loads.
    if (state.loading && !state.snapshot) {
        return (
            <div className="grid grid-cols-2 gap-4">
                <SkeletonTile />
                <SkeletonTile />
            </div>
        )
    }

    if (state.configured === false) {
        return (
            <DashCard>
                <EmptyState
                    icon={<IoPulseOutline />}
                    title="Analytics Not Connected"
                    body={
                        <>
                            Create a PostHog project and set <code className="dash-data">NEXT_PUBLIC_POSTHOG_KEY</code>,{' '}
                            <code className="dash-data">POSTHOG_PROJECT_ID</code> and{' '}
                            <code className="dash-data">POSTHOG_PERSONAL_API_KEY</code> (optionally{' '}
                            <code className="dash-data">NEXT_PUBLIC_POSTHOG_HOST</code>) to see traffic here.
                        </>
                    }
                    className="py-6"
                />
            </DashCard>
        )
    }

    if (state.error || !state.snapshot) {
        return (
            <DashCard>
                <p className="text-[13px] dash-soft">
                    Analytics is connected but the snapshot failed to load. Try refreshing.
                </p>
            </DashCard>
        )
    }

    const snap = state.snapshot
    const series = snap.series.map((b) => ({ ...b, label: formatBucket(b.t, windowKey) }))
    const hourly = snap.hourlyActivity.map((views, hour) => ({ hour: `${hour}:00`, views }))
    const showRest = !compact || showFull

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <h3 className="dash-section">Traffic</h3>
                <ViewTabs
                    tabs={WINDOWS.map((w) => ({ key: w.key, label: w.label }))}
                    active={windowKey}
                    onChange={setWindowKey}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <StatTile label="Page views" value={snap.totalViews} hint={WINDOW_HINTS[windowKey]} />
                <StatTile label="Unique visitors" value={snap.uniqueVisitors} hint={WINDOW_HINTS[windowKey]} />
            </div>

            {/* Views over time (single series — the title names it, no legend) */}
            <DashCard title="Views over time">
                <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={series} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
                        <XAxis
                            dataKey="label"
                            tick={{ fontSize: 11, fill: CHART_LABEL }}
                            tickLine={false}
                            axisLine={false}
                            minTickGap={24}
                        />
                        <Tooltip
                            contentStyle={tooltipStyle}
                            labelStyle={{ color: 'var(--dash-ink-soft)' }}
                            cursor={{ stroke: 'var(--dash-line)' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="views"
                            stroke={CHART_INK}
                            strokeWidth={2}
                            fill="var(--dash-sun-soft)"
                            fillOpacity={1}
                            dot={false}
                            activeDot={{ r: 4, fill: CHART_INK, strokeWidth: 0 }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </DashCard>

            {compact && (
                <button
                    onClick={() => setShowFull((f) => !f)}
                    aria-expanded={showFull}
                    className="dash-hoverable self-start flex items-center gap-1.5 text-[13px] font-medium text-[var(--dash-ink-soft)] hover:text-[var(--dash-ink)] rounded-full px-3 py-1.5 hover:bg-[var(--dash-sun-soft)] cursor-pointer"
                >
                    Full analytics
                    {showFull ? (
                        <IoChevronDownOutline size={14} aria-hidden />
                    ) : (
                        <IoChevronForwardOutline size={14} aria-hidden />
                    )}
                </button>
            )}

            {showRest && (
                <>
                    {/* Hourly activity — slim ink bars (§4.7) */}
                    <DashCard title="Activity by hour (UTC)">
                        <ResponsiveContainer width="100%" height={140}>
                            <BarChart data={hourly} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
                                <XAxis
                                    dataKey="hour"
                                    tick={{ fontSize: 11, fill: CHART_LABEL }}
                                    tickLine={false}
                                    axisLine={false}
                                    minTickGap={16}
                                />
                                <Tooltip
                                    contentStyle={tooltipStyle}
                                    labelStyle={{ color: 'var(--dash-ink-soft)' }}
                                    cursor={{ fill: 'var(--dash-sun-soft)' }}
                                />
                                <Bar dataKey="views" fill={CHART_INK} radius={[3, 3, 0, 0]} maxBarSize={8} />
                            </BarChart>
                        </ResponsiveContainer>
                    </DashCard>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <ProgressRows title="Traffic sources" rows={snap.sources} />
                        <ProgressRows title="Devices" rows={snap.devices} />
                        <ProgressRows title="Browsers" rows={snap.browsers} />
                        <ProgressRows title="Countries" rows={snap.countries} />
                    </div>

                    {/* Top articles */}
                    <DashCard title="Top blog articles">
                        {snap.articles.length === 0 ? (
                            <p className="text-[12px] dash-soft">No article views in this window.</p>
                        ) : (
                            <div className="divide-y divide-[var(--dash-line)]">
                                {snap.articles.slice(0, 8).map((a) => (
                                    <div key={a.slug} className="flex items-center justify-between py-2">
                                        <a
                                            href={`/blog/${encodeURIComponent(a.slug)}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-[13px] hover:underline truncate"
                                        >
                                            {a.slug}
                                        </a>
                                        <span className="dash-data dash-soft whitespace-nowrap ml-3">
                                            {a.views} views · ~{a.avgEngagedSeconds}s read
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </DashCard>
                </>
            )}
        </div>
    )
}
