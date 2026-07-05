'use client'

/**
 * Two-line display greeting (§4.8 #3): light first line, semibold name,
 * context line beneath. One per home surface — it owns the top-left.
 */
export default function HeroGreeting({ salutation, name, context }) {
    return (
        <div>
            <h1 className="dash-display">
                <strong>{salutation} {name}.</strong>
            </h1>
            {context && <p className="dash-data dash-soft mt-2">{context}</p>}
        </div>
    )
}
