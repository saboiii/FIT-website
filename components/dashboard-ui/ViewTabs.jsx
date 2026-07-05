'use client'

/**
 * Saved-view pill tabs over tables (§4.8 #4). Active = the only ink pill.
 * Tabs: [{ key, label, count? }]. Keyboard: native buttons, focus-visible.
 * Every pill is a fixed h-8 (counts never change the height), and the strip
 * scrolls horizontally inside its own box instead of wrapping or pushing
 * siblings (client polish, 2026-07-05).
 */
export default function ViewTabs({ tabs, active, onChange, className = '', ...rest }) {
    return (
        <div role="tablist" className={`dash-hscroll flex items-center gap-1 flex-nowrap ${className}`} {...rest}>
            {tabs.map((t) => {
                const isActive = t.key === active
                return (
                    <button
                        key={t.key}
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onChange(t.key)}
                        className={`dash-hoverable inline-flex h-8 shrink-0 items-center whitespace-nowrap leading-none rounded-full px-3.5 text-[13px] font-medium cursor-pointer ${
                            isActive
                                ? 'bg-[var(--dash-ink)] text-[var(--dash-canvas)]'
                                : 'text-[var(--dash-ink-soft)] hover:bg-[var(--dash-sun-soft)] hover:text-[var(--dash-ink)]'
                        }`}
                    >
                        {t.label}
                        {Number.isFinite(t.count) && (
                            <span className={`ml-1.5 dash-data ${isActive ? 'text-[rgb(250,249,245,0.7)]' : 'dash-soft'}`}>
                                {t.count}
                            </span>
                        )}
                    </button>
                )
            })}
        </div>
    )
}
