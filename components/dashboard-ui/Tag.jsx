'use client'

/**
 * Flat, NON-interactive mini label for scope/meta text in rows ("shop",
 * "print", "Optional"). Deliberately quieter than StatusPill (filled,
 * carries status) and visually distinct from buttons (interactive): no
 * fill, no border, ink-soft, fixed h-6 so rows stay one height, 11px/500
 * label casing.
 *
 * @param {{ children: import('react').ReactNode, className?: string }} props
 */
export default function Tag({ children, className = '' }) {
    return (
        <span
            className={`inline-flex h-6 shrink-0 items-center whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--dash-ink-soft)] ${className}`}
        >
            {children}
        </span>
    )
}
