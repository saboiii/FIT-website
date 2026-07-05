'use client'

/**
 * Big-numeral stat tile (§4.8 #2). Variants: `paper` (default), `ink` (the
 * view's ONE black hero), `sun` (the view's ONE yellow accent). Every tile
 * carries context — a delta or a hint — never a bare number (Law C7).
 *
 * @param {{label: string, value: string|number, delta?: number|null,
 *   hint?: string, variant?: 'paper'|'ink'|'sun', onClick?: Function,
 *   actionLabel?: string}} props
 */
export default function StatTile({ label, value, delta = null, hint, variant = 'paper', onClick, actionLabel }) {
    const surface = {
        paper: 'bg-[var(--dash-card)] border border-[var(--dash-line)] text-[var(--dash-ink)]',
        ink: 'bg-[var(--dash-ink)] text-[var(--dash-canvas)]',
        sun: 'bg-[var(--dash-sun)] text-[var(--dash-ink)]',
    }[variant]
    const labelColor = variant === 'ink' ? 'text-[rgb(250,249,245,0.65)]' : ''
    const Tag = onClick ? 'button' : 'div'

    return (
        <Tag
            onClick={onClick}
            className={`${surface} rounded-[var(--dash-r-card)] shadow-[var(--dash-shadow-card)] px-5 py-4 flex flex-col items-start gap-2 text-left ${
                onClick ? 'dash-hoverable dash-hoverable-lift cursor-pointer' : ''
            }`}
        >
            <span className={`dash-label ${labelColor}`}>{label}</span>
            <span className="dash-numeral">{value}</span>
            {delta !== null && Number.isFinite(delta) ? (
                <span
                    className="dash-data"
                    style={{ color: variant === 'ink' ? undefined : delta >= 0 ? 'var(--dash-ok)' : 'var(--dash-bad)' }}
                >
                    {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%
                </span>
            ) : hint ? (
                <span className={`dash-data ${variant === 'ink' ? labelColor : 'dash-soft'}`}>{hint}</span>
            ) : null}
            {onClick && actionLabel && (
                <span className={`text-[13px] font-medium mt-1 ${variant === 'ink' ? 'text-[var(--dash-sun)]' : ''}`}>
                    {actionLabel} →
                </span>
            )}
        </Tag>
    )
}
