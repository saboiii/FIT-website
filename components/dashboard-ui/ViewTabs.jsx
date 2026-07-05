'use client'

/**
 * Saved-view pill tabs over tables (§4.8 #4). Active = the only ink pill.
 * Tabs: [{ key, label, count? }]. Keyboard: native buttons, focus-visible.
 */
export default function ViewTabs({ tabs, active, onChange, className = '', ...rest }) {
    return (
        <div role="tablist" className={`flex items-center gap-1 flex-wrap ${className}`} {...rest}>
            {tabs.map((t) => {
                const isActive = t.key === active
                return (
                    <button
                        key={t.key}
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onChange(t.key)}
                        className={`dash-hoverable rounded-full px-3.5 py-1.5 text-[13px] font-medium cursor-pointer ${
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
