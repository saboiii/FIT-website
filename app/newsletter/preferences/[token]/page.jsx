'use client'
import { use, useEffect, useState } from 'react'
import posthog from 'posthog-js'

export default function PreferencesPage({ params }) {
    const { token } = use(params)
    const [state, setState] = useState({ loading: true })
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        fetch(`/api/newsletter/preferences/${encodeURIComponent(token)}`)
            .then((r) => r.json())
            .then((data) => setState({ loading: false, ...data }))
            .catch(() => setState({ loading: false, error: true }))
    }, [token])

    const toggleInterest = (id) => {
        setState((s) => {
            const has = s.subscriber.interestIds?.includes(id)
            const interestIds = has
                ? s.subscriber.interestIds.filter((x) => x !== id)
                : [...(s.subscriber.interestIds || []), id]
            return { ...s, subscriber: { ...s.subscriber, interestIds } }
        })
        setSaved(false)
    }

    const save = async () => {
        const res = await fetch(`/api/newsletter/preferences/${encodeURIComponent(token)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                interestIds: state.subscriber.interestIds || [],
                resubscribe: state.subscriber.status !== 'active',
            }),
        })
        if (res.ok) {
            setSaved(true)
            posthog.capture('newsletter_preferences_saved', {
                interest_count: (state.subscriber.interestIds || []).length,
                resubscribed: state.subscriber.status !== 'active',
            })
        }
    }

    if (state.loading) {
        return <div className="min-h-[60vh] flex items-center justify-center"><div className="loader" /></div>
    }
    if (state.error || !state.subscriber) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center px-8">
                <p className="text-sm text-lightColor">This preferences link is invalid or has expired.</p>
            </div>
        )
    }

    return (
        <div className="min-h-[60vh] flex flex-col items-center pt-16 pb-24 px-8">
            <div className="w-full max-w-md border border-borderColor rounded-md p-6 flex flex-col gap-4">
                <div>
                    <h1 className="text-lg font-semibold text-textColor mb-1">Email preferences</h1>
                    <p className="text-xs text-lightColor">{state.subscriber.email}</p>
                    {state.subscriber.status !== 'active' && (
                        <p className="text-[11px] text-amber-600 mt-1">Currently unsubscribed — saving re-subscribes you.</p>
                    )}
                </div>
                {state.interests?.length > 0 && (
                    <div className="flex flex-col gap-2">
                        <p className="text-xs font-medium text-textColor">Topics you follow</p>
                        {state.interests.map((i) => (
                            <label key={i._id} className="flex items-center gap-2 text-xs text-textColor">
                                <input
                                    type="checkbox"
                                    checked={state.subscriber.interestIds?.includes(String(i._id)) || false}
                                    onChange={() => toggleInterest(String(i._id))}
                                />
                                {i.name}
                                {i.description && <span className="text-lightColor">— {i.description}</span>}
                            </label>
                        ))}
                    </div>
                )}
                <button onClick={save} className="text-xs px-5 py-2.5 bg-textColor text-background rounded-full hover:bg-textColor/90 cursor-pointer self-start">
                    Save preferences
                </button>
                {saved && <p className="text-[11px] text-green-600">Saved.</p>}
            </div>
        </div>
    )
}
