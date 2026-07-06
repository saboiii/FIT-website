// Shared button/input skins for the redesigned admin panels (WP6) — token-only
// classes composed from the Sunlit Paper vocabulary (blueprint §4). Kept beside
// the panels so the storefront never imports them.

// The view's ONE yellow accent (§4.1 colour law) — primary action.
export const sunBtnCls =
    'dash-hoverable rounded-full px-3.5 py-1.5 text-[13px] font-medium bg-[var(--dash-sun)] text-[var(--dash-ink)] cursor-pointer hover:bg-[var(--dash-sun-deep)] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed'

// Ink-filled commit button (forms inside sheets).
export const inkBtnCls =
    'dash-hoverable rounded-full px-4 py-2 text-[13px] font-medium bg-[var(--dash-ink)] text-[var(--dash-canvas)] cursor-pointer active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed'

// Quiet pill button (secondary actions, GlassBar exports).
export const quietPillCls =
    'dash-hoverable rounded-full px-3.5 py-1.5 text-[13px] font-medium border border-[var(--dash-line)] bg-[var(--dash-card)] text-[var(--dash-ink)] cursor-pointer hover:bg-[var(--dash-canvas)] disabled:opacity-50 disabled:cursor-not-allowed'

// Fixed-height quiet pill for in-row TEXT actions (pill discipline §10.3):
// h-7 to line up with ActionIcon and sit one step above the h-6 StatusPill.
export const rowBtnCls =
    'dash-hoverable inline-flex h-7 shrink-0 items-center rounded-full px-3 text-[12px] font-medium border border-[var(--dash-line)] bg-[var(--dash-card)] text-[var(--dash-ink)] cursor-pointer hover:bg-[var(--dash-canvas)] disabled:opacity-50 disabled:cursor-not-allowed'

// Rounded select used inside GlassBars (filters as chips/selects).
export const barSelectCls =
    'rounded-full border border-[var(--dash-line)] bg-[var(--dash-card)] px-3 py-1.5 text-[13px] text-[var(--dash-ink)] cursor-pointer outline-none'

// Date input matching the bar selects.
export const barDateCls =
    'rounded-full border border-[var(--dash-line)] bg-[var(--dash-card)] px-3 py-1 text-[13px] text-[var(--dash-ink)] outline-none dash-data'

import { useCallback, useState } from 'react'

/**
 * Sub-view state mirrored into `?sub=` (§9.3 `?tab=<panel>&sub=<view>`) so
 * refresh/share keeps the view and Overview tiles / palette items can
 * deep-link into a panel's ViewTab. Panels mount client-side only (behind the
 * admin access gate), so the lazy read never diverges from server markup.
 * Writes use history.replaceState — no router churn, and the shell's
 * `setActiveTab` naturally drops a stale `sub` when the panel changes.
 */
export function useUrlSub(validKeys, fallback) {
    const [sub, setSub] = useState(() => {
        if (typeof window === 'undefined') return fallback
        const v = new URLSearchParams(window.location.search).get('sub')
        return validKeys.includes(v) ? v : fallback
    })
    const set = useCallback((v) => {
        setSub(v)
        try {
            const sp = new URLSearchParams(window.location.search)
            if (v === fallback) sp.delete('sub')
            else sp.set('sub', v)
            const qs = sp.toString()
            window.history.replaceState(null, '', qs ? `${window.location.pathname}?${qs}` : window.location.pathname)
        } catch { /* URL sync is a nicety — state already updated */ }
    }, [fallback])
    return [sub, set]
}
