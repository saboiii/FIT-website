'use client'

/**
 * Dotted-leader row (§4.8 #8): `label ……… value`, like a paper spec sheet.
 * The core of config views: `Layer height … 0.2 mm`.
 */
export default function DottedRow({ label, children, className = '' }) {
    return (
        <div className={`dash-leader py-1 ${className}`}>
            <span className="dash-data dash-soft shrink-0">{label}</span>
            <span className="dash-leader-dots" aria-hidden="true" />
            <span className="dash-data shrink-0 flex items-center gap-1.5">{children}</span>
        </div>
    )
}
