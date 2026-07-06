'use client'
import { IoFileTrayOutline } from 'react-icons/io5'

// Ensure the sentence reads naturally before the inline action.
const needsPeriod = (s) => !/[.!?]$/.test(String(s || '').trim())

/**
 * Minimal empty state (client directive, 2026-07-06): ONE large greyed icon
 * and ONE short sentence with the action inline, e.g. "No Digital Purchases
 * Yet. Browse Shop!". `body` is accepted for API compatibility but not
 * rendered — empty states stay quiet. `secondary` renders as a second quiet
 * inline link so no capability is lost.
 */
export default function EmptyState({ icon, title, body, cta, onCta, secondary, onSecondary, className = '' }) {
    return (
        <div className={`flex flex-col items-center text-center gap-4 py-14 px-6 ${className}`}>
            <div className="text-[var(--dash-ink-faint)] [&>svg]:h-11 [&>svg]:w-11">
                {icon || <IoFileTrayOutline aria-hidden="true" />}
            </div>
            <p className="text-[14px] dash-soft">
                <span>{title}</span>
                {needsPeriod(title) && '.'}
                {cta && (
                    <>
                        {' '}
                        <button
                            onClick={onCta}
                            className="font-medium text-[var(--dash-ink)] underline underline-offset-2 cursor-pointer"
                        >
                            {cta}
                        </button>
                    </>
                )}
                {secondary && (
                    <>
                        {' '}
                        <button
                            onClick={onSecondary}
                            className="dash-soft underline underline-offset-2 hover:text-[var(--dash-ink)] cursor-pointer"
                        >
                            {secondary}
                        </button>
                    </>
                )}
            </p>
        </div>
    )
}
