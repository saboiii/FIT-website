'use client'
// Subscription management on the "Sunlit Paper" language: plan facts as
// dotted-leader rows, cancel behind a ConfirmDialog (window.confirm/alert are
// banned), the edit flow unchanged (Stripe Elements + SubscriptionDetails).
import { useState } from 'react'
import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import dayjs from 'dayjs'
import SubscriptionDetails from '@/components/Account/SubscriptionDetails'
import AccountShell from '@/components/Account/AccountShell'
import { money } from '@/components/Account/accountUi'
import { useToast } from '@/components/General/ToastProvider'
import { ConfirmDialog, DashCard, DottedRow, StatusPill, SkeletonTile } from '@/components/dashboard-ui'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

import { useUserSubscription } from '@/utils/UserSubscriptionContext'

const statusText = (key) =>
    key ? key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ') : 'Unknown'

function Subscription() {
    const [updating, setUpdating] = useState(false)
    const [confirmCancelOpen, setConfirmCancelOpen] = useState(false)
    const [cancelBusy, setCancelBusy] = useState(false)
    const { subscription, loading: subLoading, error: subError } = useUserSubscription()
    const { showToast } = useToast()

    const updateSubButton = () => setUpdating((prev) => !prev)

    const cancelSubButton = async () => {
        setCancelBusy(true)
        const res = await fetch('/api/user/subscription/cancel', { method: 'POST' })
        if (res.ok) {
            showToast('Subscription cancelled successfully', 'success')
            // No need to manually update state, context will refresh
        } else {
            showToast('Failed to cancel subscription', 'error')
        }
        setCancelBusy(false)
        setConfirmCancelOpen(false)
    }

    const header = (
        <div>
            <p className="dash-label">Your plan</p>
            <h1 className="dash-title mt-1">Subscription</h1>
            <p className="dash-data dash-soft mt-1">View, change or cancel your plan at any time.</p>
        </div>
    )

    if (subLoading) {
        return (
            <AccountShell active="subscription" header={header}>
                <SkeletonTile className="max-w-xl" />
            </AccountShell>
        )
    }

    const hasSubscription = !!subscription?.priceId

    return (
        <AccountShell active="subscription" header={header}>
            {updating ? (
                <DashCard className="max-w-xl">
                    <button
                        type="button"
                        onClick={updateSubButton}
                        className="text-[12px] font-medium dash-soft hover:text-[var(--dash-ink)] cursor-pointer"
                    >
                        Back to plan
                    </button>
                    <Elements stripe={stripePromise}>
                        <SubscriptionDetails />
                    </Elements>
                </DashCard>
            ) : hasSubscription ? (
                <DashCard title="Your plan" className="max-w-xl">
                    <div className="flex flex-col gap-4">
                        <div>
                            <StatusPill tone={subscription.status === 'active' ? 'ok' : 'hatch'}>
                                {statusText(subscription.status)}
                            </StatusPill>
                            <div className="mt-3">
                                {Number.isFinite(subscription.price) && (
                                    <DottedRow label="Price">S${money(subscription.price / 100)} per cycle</DottedRow>
                                )}
                                {subscription.current_period_end && (
                                    <DottedRow label="Renews">
                                        {dayjs(subscription.current_period_end * 1000).format('D MMM YYYY')}
                                    </DottedRow>
                                )}
                                {subscription.created && (
                                    <DottedRow label="Member since">
                                        {dayjs(subscription.created * 1000).format('D MMM YYYY')}
                                    </DottedRow>
                                )}
                            </div>
                        </div>
                        <p className="text-[13px] dash-soft">
                            You are currently subscribed. You can edit or cancel your subscription at any time.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={updateSubButton}
                                className="dash-hoverable inline-flex items-center rounded-full bg-[var(--dash-ink)] text-[var(--dash-canvas)] px-4 py-2 text-[13px] font-medium cursor-pointer active:scale-[0.97]"
                            >
                                Edit subscription
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfirmCancelOpen(true)}
                                className="dash-hoverable inline-flex items-center rounded-full border border-[var(--dash-line)] bg-[var(--dash-card)] px-4 py-2 text-[13px] font-medium text-[var(--dash-bad)] cursor-pointer hover:bg-[var(--dash-bad-bg)]"
                            >
                                Cancel subscription
                            </button>
                        </div>
                    </div>
                </DashCard>
            ) : (
                <DashCard title="No subscription" className="max-w-xl">
                    <p className="text-[13px] dash-soft">
                        You are currently on the free tier. Upgrade to access premium features.
                    </p>
                    <button
                        type="button"
                        onClick={updateSubButton}
                        className="dash-hoverable mt-4 inline-flex items-center rounded-full bg-[var(--dash-ink)] text-[var(--dash-canvas)] px-4 py-2 text-[13px] font-medium cursor-pointer active:scale-[0.97]"
                    >
                        Sign up for subscription
                    </button>
                </DashCard>
            )}

            <ConfirmDialog
                open={confirmCancelOpen}
                onClose={() => setConfirmCancelOpen(false)}
                onConfirm={cancelSubButton}
                title="Cancel your subscription?"
                body="You will lose access to premium features at the end of the current billing period."
                confirmLabel="Cancel subscription"
                cancelLabel="Keep plan"
                tone="bad"
                busy={cancelBusy}
            />
        </AccountShell>
    )
}

export default Subscription
