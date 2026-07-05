'use client'
// Subscription change confirmation, restyled onto the account tokens. Also
// fixes the legacy template-literal bug where "${expiryDate}" rendered
// literally in the payment-failed copy.
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { DashProvider, DashCard } from '@/components/dashboard-ui'

import { useUserSubscription } from '@/utils/UserSubscriptionContext'

function SubscriptionChangeSuccess() {
    const { subscription, loading: subLoading } = useUserSubscription()
    const [pendingUpdate, setPendingUpdate] = useState(false)
    const [expiryDate, setExpiryDate] = useState('')

    useEffect(() => {
        if (!subLoading && subscription) {
            setPendingUpdate(subscription.pending_update || false)
            setExpiryDate(
                subscription.pending_update_expiry
                    ? new Date(subscription.pending_update_expiry * 1000).toLocaleDateString()
                    : '',
            )
        }
    }, [subLoading, subscription])

    return (
        <DashProvider className="border-b border-[var(--dash-line)]">
            <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
                {pendingUpdate ? (
                    <div className="w-full max-w-md text-center">
                        <h1 className="dash-title mb-4">Action required</h1>
                        <DashCard>
                            <p className="text-[13px] mb-4">
                                Your payment failed. Update your payment method in the subscription settings
                                {expiryDate ? ` by ${expiryDate}` : ''} to keep your plan.
                            </p>
                            <Link
                                href="/account/subscription"
                                className="dash-hoverable inline-flex items-center rounded-full bg-[var(--dash-ink)] text-[var(--dash-canvas)] px-4 py-2 text-[13px] font-medium"
                            >
                                Update payment method
                            </Link>
                        </DashCard>
                    </div>
                ) : (
                    <div className="w-full max-w-md text-center">
                        <h1 className="dash-title mb-4">Subscription updated!</h1>
                        <DashCard>
                            <p className="text-[13px] mb-4">
                                Your subscription has been successfully updated. Thank you for being a valued
                                member of FIT!
                            </p>
                            <Link
                                href="/"
                                className="dash-hoverable inline-flex items-center rounded-full bg-[var(--dash-ink)] text-[var(--dash-canvas)] px-4 py-2 text-[13px] font-medium"
                            >
                                Back to home
                            </Link>
                        </DashCard>
                    </div>
                )}
            </div>
        </DashProvider>
    )
}

export default SubscriptionChangeSuccess
