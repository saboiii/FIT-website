'use client'

/**
 * Vertical event timeline (§4.8 #9), newest first. items:
 * [{ id, title, note?, at (Date|string), tone?: 'sun'|'ink'|'hatch' }] —
 * tone defaults: first item sun (latest), rest ink. System events read
 * muted; human notes render in mini-cards via `note`.
 */
export default function Timeline({ items, composer, className = '' }) {
    return (
        <div className={className}>
            {composer}
            <ol className="relative mt-2 pl-5 before:absolute before:left-[5px] before:top-1 before:bottom-1 before:w-px before:bg-[var(--dash-line)]">
                {items.map((item, i) => {
                    const tone = item.tone || (i === 0 ? 'sun' : 'ink')
                    // Solid fills only — yellow borders are banned (§4.1) and
                    // markers must be ≥12px.
                    const dot = {
                        sun: 'bg-[var(--dash-sun)]',
                        ink: 'bg-[var(--dash-ink)]',
                        hatch: 'dash-hatch bg-[var(--dash-card)] border border-[var(--dash-line)]',
                    }[tone]
                    return (
                        <li key={item.id || i} className="relative pb-4 last:pb-0">
                            <span
                                aria-hidden="true"
                                className={`absolute -left-[26px] top-1 h-3 w-3 rounded-full ${dot}`}
                            />
                            <div className="flex items-baseline justify-between gap-3">
                                <p className={`text-[13px] ${i === 0 ? 'font-medium' : 'dash-soft'}`}>{item.title}</p>
                                <time className="dash-data dash-soft shrink-0">
                                    {item.at ? new Date(item.at).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                                </time>
                            </div>
                            {item.note && (
                                <p className="mt-1 text-[13px] bg-[var(--dash-canvas)] border border-[var(--dash-line)] rounded-[var(--dash-r-inner)] px-3 py-2">
                                    {item.note}
                                </p>
                            )}
                        </li>
                    )
                })}
            </ol>
        </div>
    )
}
