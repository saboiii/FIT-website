'use client'
// Stripe Express payouts row (blueprint §5.2): a quiet DashCard row. The sun
// CTA appears ONLY while onboarding is incomplete — a state change claiming
// attention; once onboarded this is a quiet link row. The link-minting flow
// (onboarding vs login link) is unchanged from the original widget.
import { useEffect, useState } from 'react'
import { DashCard } from '@/components/dashboard-ui'

function ExpressWidget({ user, isLoaded }) {
    const [accountLink, setAccountLink] = useState(null)
    const [isOnboarded, setIsOnboarded] = useState(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const checkOnboardingAndCreateLink = async () => {
            if (user?.publicMetadata?.stripeAccountId) {
                setLoading(true)
                try {
                    // Check onboarding status
                    const res = await fetch(`/api/user/express?stripeAccountId=${user.publicMetadata.stripeAccountId}`)
                    const data = await res.json()
                    const onboarded = data.onboarded === true
                    setIsOnboarded(onboarded)

                    // Create appropriate link based on onboarding status
                    const res2 = await fetch('/api/user/express', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            stripeAccountId: user.publicMetadata.stripeAccountId,
                            linkType: onboarded ? 'login' : 'onboarding',
                        }),
                    })
                    const data2 = await res2.json()
                    if (data2.url) {
                        setAccountLink(data2.url)
                    }
                } catch (error) {
                    console.error('Error creating account link:', error)
                }
                setLoading(false)
            }
        }
        if (user && isLoaded) checkOnboardingAndCreateLink()
    }, [user, isLoaded])

    if (isOnboarded === null) return null

    if (loading || !accountLink) {
        return (
            <DashCard>
                <div className="flex items-center justify-between gap-4">
                    <span className="text-[13px] font-medium">Stripe payouts</span>
                    <span className="dash-data dash-soft">Preparing account link…</span>
                </div>
            </DashCard>
        )
    }

    if (isOnboarded) {
        return (
            <DashCard>
                <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-[13px] font-medium">Stripe payouts</p>
                        <p className="dash-data dash-soft mt-0.5">Sales, payouts and account settings live in your Express dashboard.</p>
                    </div>
                    <a
                        href={accountLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-[13px] font-medium hover:underline"
                    >
                        Open dashboard →
                    </a>
                </div>
            </DashCard>
        )
    }

    return (
        <DashCard>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-[13px] font-medium">Stripe payouts</p>
                    <p className="dash-data dash-soft mt-0.5">Finish Stripe Express onboarding to start receiving payouts.</p>
                </div>
                <a
                    href={accountLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="dash-hoverable shrink-0 rounded-full bg-[var(--dash-sun)] px-4 py-2 text-[13px] font-medium text-[var(--dash-ink)] hover:bg-[var(--dash-sun-deep)] active:scale-[0.97]"
                >
                    Finish Stripe Setup
                </a>
            </div>
        </DashCard>
    )
}

export default ExpressWidget
