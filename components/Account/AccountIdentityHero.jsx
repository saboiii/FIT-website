'use client'
// Identity band at the top of the account hub: large avatar with a hover
// "Change photo" affordance (the existing Clerk setProfileImage flow), the
// name at dash-display scale, member-since and a plan chip. Sits directly on
// the canvas, no boxy card.
import Image from 'next/image'
import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { useUserSubscription } from '@/utils/UserSubscriptionContext'
import { useToast } from '../General/ToastProvider'

export default function AccountIdentityHero({ user, isLoaded }) {
    const { subscription } = useUserSubscription() || {}
    const [planName, setPlanName] = useState('')
    const [busy, setBusy] = useState(false)
    const { showToast } = useToast()

    // Resolve the plan chip label from the existing subscription-info endpoint
    // (the same one the tier picker uses); free tier needs no fetch.
    useEffect(() => {
        let cancelled = false
        const priceId = subscription?.priceId
        if (!priceId) {
            setPlanName('')
            return undefined
        }
        fetch(`/api/subscription/info?priceId=${encodeURIComponent(priceId)}`)
            .then((res) => (res.ok ? res.json() : {}))
            .then((data) => {
                if (!cancelled) setPlanName(data.productName || 'Member plan')
            })
            .catch(() => {
                if (!cancelled) setPlanName('Member plan')
            })
        return () => {
            cancelled = true
        }
    }, [subscription?.priceId])

    const handlePhotoChange = async (e) => {
        if (!user) return
        const file = e.target.files?.[0]
        if (!file) return
        setBusy(true)
        try {
            await user.setProfileImage({ file })
            await user.reload()
        } catch (err) {
            showToast('Failed to update profile photo.', 'error')
        }
        setBusy(false)
    }

    if (!isLoaded) {
        return (
            <div
                className="h-24 max-w-md animate-pulse rounded-[var(--dash-r-card)] bg-[var(--dash-line)]"
                aria-hidden="true"
            />
        )
    }

    const memberSince = user?.createdAt ? dayjs(user.createdAt).format('MMMM YYYY') : ''
    const planLabel = subscription?.priceId ? planName || 'Member plan' : 'Free plan'

    return (
        <div className="flex items-center gap-5 md:gap-7">
            <div className="group relative h-20 w-20 shrink-0 md:h-24 md:w-24">
                <label htmlFor="account-hero-photo" className="block h-full w-full cursor-pointer">
                    <Image
                        src={user?.imageUrl || '/user.jpg'}
                        alt="Profile photo"
                        width={96}
                        height={96}
                        className="h-full w-full rounded-full object-cover"
                        style={{ aspectRatio: '1 / 1' }}
                    />
                    <span className="absolute inset-0 grid place-items-center rounded-full bg-[rgba(17,17,17,0.55)] text-[11px] font-medium text-[var(--dash-canvas)] opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                        Change photo
                    </span>
                </label>
                <input
                    id="account-hero-photo"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    disabled={busy}
                    aria-label="Change profile photo"
                    className="sr-only"
                />
            </div>

            <div className="min-w-0">
                <p className="dash-label">Your account</p>
                <h1 className="dash-display mt-1 break-words">
                    <strong>{user?.fullName || user?.firstName || 'Welcome'}</strong>
                </h1>
                <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    {memberSince && <span className="dash-data dash-soft">Member since {memberSince}</span>}
                    <span className="inline-flex items-center rounded-full border border-[var(--dash-line)] bg-[var(--dash-card)] px-2.5 py-0.5 text-[11px] font-medium">
                        {planLabel}
                    </span>
                </div>
            </div>
        </div>
    )
}
