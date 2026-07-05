'use client'

/**
 * Tier-1 card (§4.8 #1): white on paper, 20px radius, hairline, warm shadow.
 * `interactive` adds the hover lift. Don't nest cards; don't give every card
 * a header.
 */
export default function DashCard({ title, action, interactive = false, className = '', children }) {
    return (
        <section
            className={`bg-[var(--dash-card)] border border-[var(--dash-line)] rounded-[var(--dash-r-card)] shadow-[var(--dash-shadow-card)] ${
                interactive ? 'dash-hoverable dash-hoverable-lift' : ''
            } ${className}`}
        >
            {(title || action) && (
                <header className="flex items-center justify-between px-5 pt-4 pb-1">
                    {title && <h3 className="dash-section">{title}</h3>}
                    {action}
                </header>
            )}
            <div className="px-5 py-4">{children}</div>
        </section>
    )
}
