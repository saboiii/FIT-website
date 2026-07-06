'use client'
// Account overview landing (UI-only): titled hairline groups on the canvas
// (latest order, subscription, digital purchases) with a "Profile
// completeness" ring in a right rail at xl. Everything is derived from
// existing endpoints; nothing new server-side.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import dayjs from 'dayjs'
import { motion } from 'framer-motion'
import { staggerParent, staggerChild } from '@/lib/motion/tokens'
import { DottedRow, StatusPill, SkeletonRow } from '@/components/dashboard-ui'
import { useUserSubscription } from '@/utils/UserSubscriptionContext'
import CompletenessRing from './CompletenessRing'
import { orderTone, money } from './accountUi'

const statusText = (key) =>
    key ? key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ') : 'Unknown'

const quietLinkCls =
    'dash-hoverable inline-flex items-center rounded-full border border-[var(--dash-line)] bg-[var(--dash-card)] px-3.5 py-1.5 text-[12px] font-medium dash-soft hover:text-[var(--dash-ink)] hover:bg-[var(--dash-canvas)]'

function Group({ title, action, children }) {
    return (
        <section>
            <div className="flex items-baseline justify-between gap-3">
                <h3 className="dash-label">{title}</h3>
                {action || null}
            </div>
            <div className="mt-2 border-t border-[var(--dash-line)] pt-4">{children}</div>
        </section>
    )
}

export default function AccountOverview({ user, isLoaded, onSelect }) {
    const subscriptionContext = useUserSubscription() || {}
    const { subscription, loading: subLoading } = subscriptionContext

    const [latestOrder, setLatestOrder] = useState(null)
    const [latestProduct, setLatestProduct] = useState(null)
    const [orderCount, setOrderCount] = useState(0)
    const [ordersLoaded, setOrdersLoaded] = useState(false)
    const [downloadCount, setDownloadCount] = useState(0)
    const [downloadsLoaded, setDownloadsLoaded] = useState(false)
    const [hasPhone, setHasPhone] = useState(false)
    const [hasAddress, setHasAddress] = useState(false)
    const [contactLoaded, setContactLoaded] = useState(false)

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
                const first = sorted[0] || null
                setLatestOrder(first)
                setOrderCount(sorted.length)

                // Resolve the latest order's product (for the order-again link).
                const pid = first?.cartItem?.productId
                if (pid && /^[0-9a-fA-F]{24}$/.test(String(pid))) {
                    const prodRes = await fetch(`/api/product?ids=${pid}`)
                    if (prodRes.ok) {
                        const prodData = await prodRes.json()
                        if (!cancelled) setLatestProduct((prodData.products || [])[0] || null)
                    }
                }
            } catch (e) {
                // Quiet: the group falls back to its empty copy.
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

    // Contact facts feed the completeness ring only (same endpoints the
    // billing section already uses).
    useEffect(() => {
        let cancelled = false
        Promise.all([
            fetch('/api/user/contact/phone').then((res) => (res.ok ? res.json() : {})),
            fetch('/api/user/contact/address').then((res) => (res.ok ? res.json() : {})),
        ])
            .then(([phoneData, addressData]) => {
                if (cancelled) return
                const p = phoneData.phone || {}
                const a = addressData.address || {}
                setHasPhone(Boolean(p.countryCode || p.number))
                setHasAddress(
                    Boolean(a.street || a.unitNumber || a.city || a.state || a.postalCode || a.country),
                )
            })
            .catch(() => {})
            .finally(() => {
                if (!cancelled) setContactLoaded(true)
            })
        return () => {
            cancelled = true
        }
    }, [])

    const ringReady = isLoaded && user && ordersLoaded && contactLoaded
    const ringItems = ringReady
        ? [
              { key: 'photo', label: 'Profile photo', done: Boolean(user.hasImage), tab: 'profile' },
              { key: 'name', label: 'Display name', done: Boolean(user.fullName), tab: 'profile' },
              { key: 'phone', label: 'Phone number', done: hasPhone, tab: 'billing' },
              { key: 'address', label: 'Billing address', done: hasAddress, tab: 'billing' },
              { key: 'password', label: 'Password', done: Boolean(user.passwordEnabled), tab: 'security' },
              { key: 'orders', label: 'First order', done: orderCount > 0, tab: 'orders' },
          ]
        : []

    const cartItem = latestOrder?.cartItem || {}
    const canOrderAgain = latestOrder?.status === 'delivered' && latestProduct?.slug

    return (
        <div className="flex flex-col gap-10 xl:flex-row xl:items-start xl:gap-14">
            <motion.div
                variants={staggerParent}
                initial="hidden"
                animate="show"
                className="flex min-w-0 flex-1 flex-col gap-10"
            >
                <motion.div variants={staggerChild}>
                    <Group
                        title="Latest order"
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
                                    <span className="dash-data">
                                        #{String(latestOrder._id || '').slice(-8).toUpperCase()}
                                    </span>
                                    <StatusPill tone={orderTone(latestOrder.status)}>
                                        {statusText(latestOrder.status)}
                                    </StatusPill>
                                </div>
                                <div className="mt-2 max-w-sm">
                                    <DottedRow label="Placed">
                                        {latestOrder.createdAt
                                            ? dayjs(latestOrder.createdAt).format('D MMM YYYY')
                                            : 'Unknown'}
                                    </DottedRow>
                                    <DottedRow label="Total">
                                        {cartItem.currency || 'S'}$
                                        {money((cartItem.price || 0) * (cartItem.quantity || 1))}
                                    </DottedRow>
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <Link href={`/account/orders/${latestOrder._id}`} className={quietLinkCls}>
                                        View order
                                    </Link>
                                    {canOrderAgain && (
                                        <Link href={`/products/${latestProduct.slug}`} className={quietLinkCls}>
                                            Order again
                                        </Link>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div>
                                <p className="text-[13px] dash-soft">Nothing on the way yet.</p>
                                <Link href="/shop" className={`${quietLinkCls} mt-3`}>
                                    Browse the shop
                                </Link>
                            </div>
                        )}
                    </Group>
                </motion.div>

                <motion.div variants={staggerChild}>
                    <Group
                        title="Subscription"
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
                                <div className="mt-2 max-w-sm">
                                    {Number.isFinite(subscription.price) && (
                                        <DottedRow label="Price">
                                            S${money(subscription.price / 100)} per cycle
                                        </DottedRow>
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
                    </Group>
                </motion.div>

                <motion.div variants={staggerChild}>
                    <Group
                        title="Digital purchases"
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
                                {downloadCount} purchase{downloadCount === 1 ? '' : 's'} with downloadable
                                files, ready whenever you need them.
                            </p>
                        ) : (
                            <p className="text-[13px] dash-soft">
                                Digital files you buy will be downloadable here.
                            </p>
                        )}
                    </Group>
                </motion.div>
            </motion.div>

            <aside className="shrink-0 xl:w-[240px]">
                <h3 className="dash-label">Profile completeness</h3>
                <div className="mt-2 border-t border-[var(--dash-line)] pt-5">
                    {ringReady ? <CompletenessRing items={ringItems} onGo={onSelect} /> : <SkeletonRow />}
                </div>
            </aside>
        </div>
    )
}
