'use client'
// Account overview landing (new, UI-only): the next order at a glance, the
// subscription state, digital purchases, and profile completeness hints.
// Everything is derived from existing endpoints; nothing new server-side.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import dayjs from 'dayjs'
import { motion } from 'framer-motion'
import { staggerParent, staggerChild } from '@/lib/motion/tokens'
import { DashCard, DottedRow, StatusPill, SkeletonRow } from '@/components/dashboard-ui'
import { useUserSubscription } from '@/utils/UserSubscriptionContext'
import { orderTone, money } from './accountUi'

const statusText = (key) =>
    key ? key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ') : 'Unknown'

function CompletenessRow({ done, label, onGo }) {
    return (
        <button
            type="button"
            onClick={onGo}
            className="dash-hoverable flex w-full items-center gap-2.5 rounded-[var(--dash-r-inner)] px-2 py-1.5 text-left cursor-pointer hover:bg-[var(--dash-canvas)]"
        >
            <span
                aria-hidden="true"
                className={`h-3 w-3 rounded-full shrink-0 ${
                    done ? 'bg-[var(--dash-ink)]' : 'dash-hatch bg-[var(--dash-card)] border border-[var(--dash-line)]'
                }`}
            />
            <span className={`text-[13px] ${done ? 'dash-soft line-through' : ''}`}>{label}</span>
        </button>
    )
}

export default function AccountOverview({ user, isLoaded, onSelect }) {
    const subscriptionContext = useUserSubscription() || {}
    const { subscription, loading: subLoading } = subscriptionContext

    const [latestOrder, setLatestOrder] = useState(null)
    const [orderCount, setOrderCount] = useState(0)
    const [ordersLoaded, setOrdersLoaded] = useState(false)
    const [downloadCount, setDownloadCount] = useState(0)
    const [downloadsLoaded, setDownloadsLoaded] = useState(false)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const res = await fetch('/api/user/orders')
                if (!res.ok) return
                const data = await res.json()
                if (cancelled) return
                const sorted = [...(data.orders || [])].sort(
                    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
                )
                setLatestOrder(sorted[0] || null)
                setOrderCount(sorted.length)
            } catch (e) {
                // Quiet: the card falls back to its empty copy.
            } finally {
                if (!cancelled) setOrdersLoaded(true)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [])

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const res = await fetch('/api/asset/storage')
                if (!res.ok) return
                const data = await res.json()
                if (!cancelled) setDownloadCount((data.transactions || []).length)
            } catch (e) {
                // Quiet.
            } finally {
                if (!cancelled) setDownloadsLoaded(true)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [])

    const hints = isLoaded && user
        ? [
              { key: 'name', done: Boolean(user.fullName), label: 'Add your name', tab: 'profile' },
              { key: 'photo', done: Boolean(user.hasImage), label: 'Add a profile photo', tab: 'profile' },
              { key: 'password', done: Boolean(user.passwordEnabled), label: 'Set a password', tab: 'security' },
          ]
        : []

    const cartItem = latestOrder?.cartItem || {}

    return (
        <motion.div
            variants={staggerParent}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
            <motion.div variants={staggerChild} className="min-w-0">
                <DashCard
                    title="Latest order"
                    className="h-full"
                    action={
                        orderCount > 0 && (
                            <button
                                type="button"
                                onClick={() => onSelect('orders')}
                                className="text-[12px] font-medium dash-soft hover:text-[var(--dash-ink)] cursor-pointer"
                            >
                                All orders ({orderCount})
                            </button>
                        )
                    }
                >
                    {!ordersLoaded ? (
                        <SkeletonRow />
                    ) : latestOrder ? (
                        <div>
                            <div className="flex items-center justify-between gap-3">
                                <span className="dash-data">#{String(latestOrder._id || '').slice(-8).toUpperCase()}</span>
                                <StatusPill tone={orderTone(latestOrder.status)}>{statusText(latestOrder.status)}</StatusPill>
                            </div>
                            <div className="mt-2">
                                <DottedRow label="Placed">
                                    {latestOrder.createdAt ? dayjs(latestOrder.createdAt).format('D MMM YYYY') : 'Unknown'}
                                </DottedRow>
                                <DottedRow label="Total">
                                    {cartItem.currency || 'S'}${money((cartItem.price || 0) * (cartItem.quantity || 1))}
                                </DottedRow>
                            </div>
                            <Link
                                href={`/account/orders/${latestOrder._id}`}
                                className="dash-hoverable mt-3 inline-flex items-center rounded-full border border-[var(--dash-line)] bg-[var(--dash-card)] px-3.5 py-1.5 text-[12px] font-medium dash-soft hover:text-[var(--dash-ink)] hover:bg-[var(--dash-canvas)]"
                            >
                                View order
                            </Link>
                        </div>
                    ) : (
                        <div>
                            <p className="text-[13px] dash-soft">Nothing on the way yet.</p>
                            <Link
                                href="/shop"
                                className="dash-hoverable mt-3 inline-flex items-center rounded-full border border-[var(--dash-line)] bg-[var(--dash-card)] px-3.5 py-1.5 text-[12px] font-medium dash-soft hover:text-[var(--dash-ink)] hover:bg-[var(--dash-canvas)]"
                            >
                                Browse the shop
                            </Link>
                        </div>
                    )}
                </DashCard>
            </motion.div>

            <motion.div variants={staggerChild} className="min-w-0">
                <DashCard
                    title="Subscription"
                    className="h-full"
                    action={
                        <Link
                            href="/account/subscription"
                            className="text-[12px] font-medium dash-soft hover:text-[var(--dash-ink)]"
                        >
                            Manage plan
                        </Link>
                    }
                >
                    {subLoading ? (
                        <SkeletonRow />
                    ) : subscription?.priceId ? (
                        <div>
                            <StatusPill tone={subscription.status === 'active' ? 'ok' : 'hatch'}>
                                {statusText(subscription.status)}
                            </StatusPill>
                            <div className="mt-2">
                                {Number.isFinite(subscription.price) && (
                                    <DottedRow label="Price">S${money(subscription.price / 100)} per cycle</DottedRow>
                                )}
                                {subscription.current_period_end && (
                                    <DottedRow label="Renews">
                                        {dayjs(subscription.current_period_end * 1000).format('D MMM YYYY')}
                                    </DottedRow>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-[13px] dash-soft">
                            You are on the free tier. Upgrade any time from the subscription page.
                        </p>
                    )}
                </DashCard>
            </motion.div>

            <motion.div variants={staggerChild} className="min-w-0">
                <DashCard
                    title="Digital purchases"
                    className="h-full"
                    action={
                        <button
                            type="button"
                            onClick={() => onSelect('downloads')}
                            className="text-[12px] font-medium dash-soft hover:text-[var(--dash-ink)] cursor-pointer"
                        >
                            Open downloads
                        </button>
                    }
                >
                    {!downloadsLoaded ? (
                        <SkeletonRow />
                    ) : downloadCount > 0 ? (
                        <p className="text-[13px]">
                            {downloadCount} purchase{downloadCount === 1 ? '' : 's'} with downloadable files, ready
                            whenever you need them.
                        </p>
                    ) : (
                        <p className="text-[13px] dash-soft">Digital files you buy will be downloadable here.</p>
                    )}
                </DashCard>
            </motion.div>

            <motion.div variants={staggerChild} className="min-w-0">
                <DashCard title="Profile completeness" className="h-full">
                    {hints.length === 0 ? (
                        <SkeletonRow />
                    ) : (
                        <ul className="-mx-2 flex flex-col">
                            {hints.map((h) => (
                                <li key={h.key}>
                                    <CompletenessRow done={h.done} label={h.label} onGo={() => onSelect(h.tab)} />
                                </li>
                            ))}
                        </ul>
                    )}
                </DashCard>
            </motion.div>
        </motion.div>
    )
}
