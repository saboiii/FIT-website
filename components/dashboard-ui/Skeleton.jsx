'use client'

/**
 * First-load-only placeholders (§4.8 #19; Law C5 — never over populated
 * data). The shimmer is a slow opacity breathe, not a sweep.
 */
export function SkeletonTile({ className = '' }) {
    return (
        <div
            className={`animate-pulse bg-[var(--dash-line)] rounded-[var(--dash-r-card)] h-[104px] ${className}`}
            aria-hidden="true"
        />
    )
}

export function SkeletonRow({ className = '' }) {
    return <div className={`animate-pulse bg-[var(--dash-line)] rounded-[var(--dash-r-inner)] h-9 ${className}`} aria-hidden="true" />
}
