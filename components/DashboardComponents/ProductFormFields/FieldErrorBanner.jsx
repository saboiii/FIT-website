import React from 'react'
import { MdErrorOutline } from 'react-icons/md'

/**
 * Reusable inline validation banner for highlighting missing or invalid fields.
 * Renders as the document form's error strip (--dash-bad-bg, blueprint §5.5).
 */
export default function FieldErrorBanner({
    title = 'Missing required information',
    message,
    children,
    className = '',
}) {
    return (
        <div
            className={`flex items-start gap-3 rounded-[var(--dash-r-inner)] bg-[var(--dash-bad-bg)] px-3 py-2 text-[13px] text-[var(--dash-bad)] ${className}`}
        >
            <div className="mt-0.5">
                <MdErrorOutline aria-hidden="true" />
            </div>
            <div className="space-y-0.5">
                {title && (
                    <p className="font-medium leading-snug">
                        {title}
                    </p>
                )}
                {message && (
                    <p className="leading-snug">
                        {message}
                    </p>
                )}
                {children}
            </div>
        </div>
    )
}
