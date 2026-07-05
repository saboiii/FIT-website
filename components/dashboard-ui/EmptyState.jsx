'use client'

/**
 * Codified empty state (§4.8 #13, Vercel anatomy + Law C6): icon, Title Case
 * title, ONE additive sentence, exactly one primary CTA ("Verb + Noun", sun
 * fill — it is the view's yellow budget) + optional quiet secondary.
 */
export default function EmptyState({ icon, title, body, cta, onCta, secondary, onSecondary, className = '' }) {
    return (
        <div className={`flex flex-col items-center text-center gap-3 py-12 px-6 ${className}`}>
            {icon && <div className="text-[var(--dash-ink-soft)] [&>svg]:h-7 [&>svg]:w-7">{icon}</div>}
            <h3 className="dash-section">{title}</h3>
            {body && <p className="text-[13px] dash-soft max-w-sm">{body}</p>}
            {(cta || secondary) && (
                <div className="flex items-center gap-3 mt-2">
                    {cta && (
                        <button
                            onClick={onCta}
                            className="dash-hoverable rounded-full px-4 py-2 text-[13px] font-medium bg-[var(--dash-sun)] text-[var(--dash-ink)] cursor-pointer hover:bg-[var(--dash-sun-deep)] active:scale-[0.97]"
                        >
                            {cta}
                        </button>
                    )}
                    {secondary && (
                        <button onClick={onSecondary} className="text-[13px] dash-soft hover:text-[var(--dash-ink)] cursor-pointer">
                            {secondary}
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}
