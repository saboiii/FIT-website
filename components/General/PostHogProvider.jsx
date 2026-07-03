'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import posthog from 'posthog-js'

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'
const CONSENT_KEY = 'fit_cookie_consent'

function readConsent() {
    try { return localStorage.getItem(CONSENT_KEY) } catch { return null }
}

// Pageview capture, gated on cookie consent. No-op entirely without a key.
export default function PostHogProvider({ children }) {
    const pathname = usePathname()
    const [consent, setConsent] = useState(null) // null = undecided
    const [ready, setReady] = useState(false)

    useEffect(() => {
        setConsent(readConsent())
    }, [])

    useEffect(() => {
        if (!KEY || consent !== 'accepted' || ready) return
        posthog.init(KEY, {
            api_host: HOST,
            capture_pageview: false, // captured manually on route change below
            persistence: 'localStorage+cookie',
        })
        setReady(true)
    }, [consent, ready])

    useEffect(() => {
        if (ready && pathname) posthog.capture('$pageview')
    }, [ready, pathname])

    const decide = (value) => {
        try { localStorage.setItem(CONSENT_KEY, value) } catch { /* ignore */ }
        setConsent(value)
    }

    return (
        <>
            {children}
            {KEY && consent === null && (
                <div className="fixed bottom-4 left-4 right-4 md:left-auto md:max-w-sm z-50 bg-background border border-borderColor rounded-md p-4 shadow-sm">
                    <p className="text-xs text-textColor mb-3">
                        We use cookies to understand how the site is used and improve it.
                    </p>
                    <div className="flex gap-2 justify-end">
                        <button onClick={() => decide('declined')} className="text-xs px-3 py-1.5 border border-borderColor rounded-full hover:bg-baseColor cursor-pointer">
                            Decline
                        </button>
                        <button onClick={() => decide('accepted')} className="text-xs px-3 py-1.5 bg-textColor text-background rounded-full hover:bg-textColor/90 cursor-pointer">
                            Accept
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
