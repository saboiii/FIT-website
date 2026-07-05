'use client'
import { useState } from 'react'
import posthog from 'posthog-js'

// Newsletter email capture (used on the blog listing page).
export default function SubscribeForm() {
    const [email, setEmail] = useState('')
    const [state, setState] = useState('idle') // idle | busy | done | error

    const submit = async (e) => {
        e.preventDefault()
        if (!email.trim()) return
        setState('busy')
        try {
            const res = await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim() }),
            })
            setState(res.ok ? 'done' : 'error')
            if (res.ok) posthog.capture('newsletter_subscribed', { source: 'blog_footer' })
        } catch {
            setState('error')
        }
    }

    if (state === 'done') {
        return (
            <p className="text-xs text-textColor border border-borderColor rounded-md px-4 py-3 bg-baseColor">
                You&apos;re subscribed — welcome aboard!
            </p>
        )
    }

    return (
        <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 w-full max-w-md">
            <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="formInput text-sm flex-1"
                aria-label="Email address"
            />
            <button
                type="submit"
                disabled={state === 'busy'}
                className="text-xs px-5 py-2.5 bg-textColor text-background rounded-full hover:bg-textColor/90 cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
                {state === 'busy' ? 'Subscribing…' : 'Subscribe'}
            </button>
            {state === 'error' && <p className="text-[11px] text-red-500 self-center">Something went wrong — try again.</p>}
        </form>
    )
}
