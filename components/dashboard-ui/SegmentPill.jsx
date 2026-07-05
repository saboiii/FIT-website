'use client'

/**
 * Proportional segmented bar (§4.8 #7) — replaces mini pies/donuts.
 * segments: [{ label, value, tone: 'ink'|'sun'|'hatch' }]. Labels render
 * above; segments below, widths proportional.
 */
const FILL = {
    ink: 'bg-[var(--dash-ink)]',
    sun: 'bg-[var(--dash-sun)]',
    hatch: 'dash-hatch bg-[var(--dash-card)]',
}

export default function SegmentPill({ segments, className = '' }) {
    const total = segments.reduce((a, s) => a + Math.max(0, s.value), 0) || 1
    return (
        <div className={className}>
            <div className="flex justify-between gap-2 mb-1.5">
                {segments.map((s) => (
                    <span key={s.label} className="dash-label">
                        {s.label} <span className="dash-data text-[var(--dash-ink)]">{s.value}</span>
                    </span>
                ))}
            </div>
            <div className="flex h-6 rounded-full overflow-hidden border border-[var(--dash-line)]">
                {segments.map((s) => (
                    <div
                        key={s.label}
                        className={FILL[s.tone] || FILL.hatch}
                        style={{ width: `${(Math.max(0, s.value) / total) * 100}%` }}
                        title={`${s.label}: ${s.value}`}
                    />
                ))}
            </div>
        </div>
    )
}
