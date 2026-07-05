'use client'

/**
 * Sticky toolbar (§4.8 #12) — the thin/bar material tier. Holds search,
 * view tabs, bulk/save actions. Only used where content scrolls beneath.
 */
export default function GlassBar({ children, className = '' }) {
    return (
        <div className={`glass-warm sticky top-0 z-20 rounded-[var(--dash-r-inner)] px-4 py-2.5 flex items-center gap-3 ${className}`}>
            {children}
        </div>
    )
}
