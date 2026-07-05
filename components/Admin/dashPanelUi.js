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

// Rounded select used inside GlassBars (filters as chips/selects).
export const barSelectCls =
    'rounded-full border border-[var(--dash-line)] bg-[var(--dash-card)] px-3 py-1.5 text-[13px] text-[var(--dash-ink)] cursor-pointer outline-none'

// Date input matching the bar selects.
export const barDateCls =
    'rounded-full border border-[var(--dash-line)] bg-[var(--dash-card)] px-3 py-1 text-[13px] text-[var(--dash-ink)] outline-none dash-data'
