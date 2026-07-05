'use client'

/**
 * Honest-stub affordance for blueprint §6 [STUB] rows: a small hatch-textured
 * pill that marks UI whose backend does not exist yet. Contract: never pair it
 * with fake data presented as real, and never leave a live-looking control
 * behind it — stub actions carry the `disabled` attribute plus a title tooltip.
 */
export default function ComingSoon({ className = '' }) {
    return (
        <span
            className={`dash-hatch inline-flex items-center rounded-full border border-[var(--dash-line)] bg-[var(--dash-card)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--dash-ink-soft)] whitespace-nowrap ${className}`}
        >
            Coming soon
        </span>
    )
}

/**
 * Optional disabled-wrapper for a ghost of an intended layout: children are
 * dimmed, non-interactive (pointer events off, hidden from the a11y tree) and
 * carry a title tooltip explaining why.
 */
export function ComingSoonBlock({ title = 'Coming soon: needs backend', children, className = '' }) {
    return (
        <div aria-hidden="true" title={title} className={`pointer-events-none select-none opacity-60 ${className}`}>
            {children}
        </div>
    )
}
