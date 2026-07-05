'use client'

/**
 * The status vocabulary rendered (§4.8 #6):
 * sun = current/selected/today · ink = done/total · hatch = pending/other ·
 * ok/bad = money & terminal states · paper = neutral.
 */
const TONES = {
    sun: 'bg-[var(--dash-sun)] text-[var(--dash-ink)]',
    ink: 'bg-[var(--dash-ink)] text-[var(--dash-canvas)]',
    hatch: 'dash-hatch bg-[var(--dash-card)] text-[var(--dash-ink)] border border-[var(--dash-line)]',
    ok: 'bg-[var(--dash-ok-bg)] text-[var(--dash-ok)]',
    bad: 'bg-[var(--dash-bad-bg)] text-[var(--dash-bad)]',
    paper: 'bg-[var(--dash-card)] text-[var(--dash-ink-soft)] border border-[var(--dash-line)]',
}

export default function StatusPill({ tone = 'paper', children, className = '' }) {
    return (
        <span
            className={`inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[11px] font-medium leading-none whitespace-nowrap ${TONES[tone] || TONES.paper} ${className}`}
        >
            {children}
        </span>
    )
}
