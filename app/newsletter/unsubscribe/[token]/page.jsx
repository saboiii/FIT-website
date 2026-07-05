'use client'
import { use, useState } from 'react'
import Link from 'next/link'
import posthog from 'posthog-js'

export default function UnsubscribePage({ params }) {
    const { token } = use(params)
    const [state, setState] = useState('idle') // idle | busy | done | error

    const unsubscribe = async () => {
        setState('busy')
        try {
            const res = await fetch(`/api/newsletter/unsubscribe/${encodeURIComponent(token)}`, { method: 'POST' })
            setState(res.ok ? 'done' : 'error')
            if (res.ok) posthog.capture('newsletter_unsubscribed')
        } catch {
            setState('error')
        }
    }

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-8">
            <div className="w-full max-w-md border border-borderColor rounded-md p-6 flex flex-col gap-4 text-center items-center">
                {state === 'done' ? (
                    <>
                        <h1 className="text-lg font-semibold text-textColor">You&apos;re unsubscribed</h1>
                        <p className="text-xs text-lightColor">
                            Sorry to see you go. Changed your mind?{' '}
                            <Link href={`/newsletter/preferences/${encodeURIComponent(token)}`} className="underline">
                                Manage preferences
                            </Link>
                        </p>
                    </>
                ) : (
                    <>
                        <h1 className="text-lg font-semibold text-textColor">Unsubscribe from our emails?</h1>
                        <p className="text-xs text-lightColor">You&apos;ll stop receiving the newsletter immediately.</p>
                        <button
                            onClick={unsubscribe}
                            disabled={state === 'busy'}
                            className="text-xs px-5 py-2.5 bg-textColor text-background rounded-full hover:bg-textColor/90 cursor-pointer disabled:opacity-50"
                        >
                            {state === 'busy' ? 'Unsubscribing…' : 'Unsubscribe'}
                        </button>
                        {state === 'error' && <p className="text-[11px] text-red-500">This link is invalid or expired.</p>}
                    </>
                )}
            </div>
        </div>
    )
}
