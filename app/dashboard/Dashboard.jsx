'use client'
// Creator home — "the morning desk" (blueprint §5.1–5.2). Hero: the greeting
// + revenue chart card. Rail sits ON the canvas (no bordered boxes); nav is
// label-style links; the admin shortcut is a quiet bottom link.
import { useEffect, useMemo, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { motion } from 'framer-motion'
import { IoPencilOutline } from 'react-icons/io5'
import { staggerParent, staggerChild } from '@/lib/motion/tokens'
import { DashCard, HeroGreeting, SegmentPill, StatTile } from '@/components/dashboard-ui'
import useAccess from '@/utils/useAccess'
import RevenueCard from '@/components/DashboardComponents/RevenueCard'
import OrdersLedger from '@/components/DashboardComponents/OrdersLedger'
import ExpressWidget from '@/components/DashboardComponents/ExpressWidget'
import SetupChecklist from '@/components/DashboardComponents/SetupChecklist'
import { currencyPrefix, formatMoney } from '@/components/DashboardComponents/format'

dayjs.extend(relativeTime)

const NAV_LINKS = [
    { href: '/dashboard', label: 'Home', active: true },
    { href: '/dashboard/products', label: 'My products' },
    { href: '/dashboard/messages', label: 'Messages' },
    { href: '/account', label: 'Account settings' },
]

function salutationFor(hour) {
    if (hour < 12) return 'Good morning,'
    if (hour < 18) return 'Good afternoon,'
    return 'Good evening,'
}

const isRawUserId = (value) => typeof value === 'string' && /^user_[a-zA-Z0-9]+$/.test(value.trim())

function Dashboard() {
    const { user, isLoaded } = useUser()
    const { isAdmin } = useAccess()
    const [myProducts, setMyProducts] = useState([])
    const [orders, setOrders] = useState([])
    const [ordersUpdatedAt, setOrdersUpdatedAt] = useState(null)
    const [unreadMessages, setUnreadMessages] = useState(0)

    // Shop display name (rail identity block). GET/PUT /api/user/display-name;
    // if the GET fails the inline editor stays hidden, as before.
    const [displayName, setDisplayName] = useState('')
    const [displayNameAvailable, setDisplayNameAvailable] = useState(false)
    const [editingName, setEditingName] = useState(false)
    const [nameDraft, setNameDraft] = useState('')
    const [savingDisplayName, setSavingDisplayName] = useState(false)
    const [displayNameError, setDisplayNameError] = useState('')
    const [displayNameSaved, setDisplayNameSaved] = useState(false)

    useEffect(() => {
        if (!user || !isLoaded) return
        const fetchProducts = async () => {
            const res = await fetch(`/api/product?creatorUserId=${user.id}`)
            const data = await res.json()
            setMyProducts(data.products || [])
        }
        fetchProducts()
    }, [user, isLoaded])

    useEffect(() => {
        if (!user || !isLoaded) return
        let cancelled = false
        ;(async () => {
            try {
                const res = await fetch('/api/user/display-name')
                if (!res.ok) return // Non-subscribed users may not have access; keep editor hidden.
                const data = await res.json()
                if (!cancelled) {
                    setDisplayName(data.displayName || '')
                    setDisplayNameAvailable(true)
                }
            } catch (e) {
                // Keep the editor hidden on failure.
            }
        })()
        return () => { cancelled = true }
    }, [user, isLoaded])

    // Orders across all of this creator's products (drives the ledger, the
    // hero context line and the needs-attention triage).
    useEffect(() => {
        if (!user || myProducts.length === 0) return
        const fetchOrders = async () => {
            const productIds = myProducts.map((p) => p._id)
            const res = await fetch('/api/user/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ productIds }),
            })
            const users = await res.json()
            const myProductMap = Object.fromEntries(myProducts.map((p) => [p._id, p.name]))
            const results = []
            const userList = Array.isArray(users) ? users : []
            userList.forEach((u) => {
                if (!u.orderHistory || !Array.isArray(u.orderHistory)) return
                u.orderHistory.forEach((order) => {
                    const item = order.cartItem
                    if (item && productIds.includes(item.productId)) {
                        results.push({
                            productId: item.productId,
                            productName: myProductMap[item.productId],
                            buyerId: u.userId,
                            buyerFirstName: u.firstName || '',
                            buyerEmail: u.emailAddresses?.[0]?.emailAddress || '',
                            orderStatus: order.status,
                            orderType: order.orderType || 'order',
                            printStatus: order.printStatus || null,
                            quantity: item.quantity,
                            orderedAt: order.createdAt,
                            orderId: order._id,
                            contact: u.contact || null,
                            orderNote: item.orderNote || '',
                            deliveryType: item.chosenDeliveryType || '',
                            price: item.price || 0,
                            printConfiguration: order.printConfiguration || null,
                            trackingId: order.trackingId || null,
                        })
                    }
                })
            })
            setOrders(results)
            setOrdersUpdatedAt(new Date())
        }
        fetchOrders()
    }, [user, myProducts])

    // Unread messages for the needs-attention block — best effort, hidden on
    // any error.
    useEffect(() => {
        if (!user || !isLoaded) return
        let cancelled = false
        ;(async () => {
            try {
                const res = await fetch('/api/chat/inbox')
                if (!res.ok) return
                const data = await res.json()
                const unread = (data.channels || []).reduce((acc, c) => acc + (c.unreadCount || 0), 0)
                if (!cancelled) setUnreadMessages(unread)
            } catch (e) {
                // Quietly hide the row on error.
            }
        })()
        return () => { cancelled = true }
    }, [user, isLoaded])

    const saveDisplayName = async () => {
        try {
            setSavingDisplayName(true)
            setDisplayNameError('')
            setDisplayNameSaved(false)
            const res = await fetch('/api/user/display-name', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ displayName: nameDraft }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) {
                setDisplayNameError(data.error || 'Failed to save')
                return
            }
            setDisplayName(data.displayName || nameDraft)
            setDisplayNameSaved(true)
            setEditingName(false)
        } catch (e) {
            setDisplayNameError(e?.message || 'Failed to save')
        } finally {
            setSavingDisplayName(false)
        }
    }

    const prefix = currencyPrefix(myProducts.find((p) => p?.basePrice?.presentmentCurrency)?.basePrice?.presentmentCurrency)

    const ordersThisMonth = useMemo(
        () => orders.filter((o) => dayjs(o.orderedAt).isSame(dayjs(), 'month')).length,
        [orders],
    )
    const pendingOrders = useMemo(() => orders.filter((o) => o.orderStatus === 'pending').length, [orders])

    const { grossThisMonth, grossLastMonth } = useMemo(() => {
        let cur = 0
        let last = 0
        const now = dayjs()
        myProducts.forEach((product) => {
            ;(product?.sales || []).forEach((sale) => {
                if (!sale?.createdAt) return
                const gross = (sale.quantity || 0) * (sale.price || 0)
                const at = dayjs(sale.createdAt)
                if (at.isSame(now, 'month')) cur += gross
                else if (at.isSame(now.subtract(1, 'month'), 'month')) last += gross
            })
        })
        return { grossThisMonth: cur, grossLastMonth: last }
    }, [myProducts])
    const grossDelta = grossLastMonth > 0 ? Math.round(((grossThisMonth - grossLastMonth) / grossLastMonth) * 100) : null

    const totalLikes = myProducts.reduce(
        (acc, p) => acc + (Array.isArray(p.likes) ? p.likes.length : Number(p.likes) || 0),
        0,
    )
    const totalDownloads = myProducts.reduce((acc, p) => acc + (p.downloads || 0), 0)
    const avgRating = myProducts.length > 0
        ? (myProducts.reduce((acc, p) => acc + (p.rating || 0), 0) / myProducts.length).toFixed(1)
        : null

    // Needs-attention triage (§5.2): rows render only when count > 0.
    const attention = useMemo(() => {
        const rows = []
        if (unreadMessages > 0) {
            rows.push({
                key: 'unread',
                label: `${unreadMessages} unread message${unreadMessages === 1 ? '' : 's'}`,
                href: '/dashboard/messages',
            })
        }
        if (pendingOrders > 0) {
            rows.push({
                key: 'ship',
                label: `${pendingOrders} order${pendingOrders === 1 ? '' : 's'} awaiting shipment`,
                href: '#orders',
            })
        }
        myProducts.forEach((p) => {
            const lowStock = (p.variantTypes || [])
                .flatMap((t) => t.options || [])
                .filter((o) => typeof o.stock === 'number' && o.stock <= 2).length
            if (lowStock > 0) {
                rows.push({
                    key: `stock-${p._id}`,
                    label: `Low stock: ${p.name}`,
                    href: `/dashboard/products/edit/${p._id}`,
                })
            }
        })
        return rows.slice(0, 5)
    }, [unreadMessages, pendingOrders, myProducts])

    if (!isLoaded) {
        return (
            <div className="flex min-h-[92vh] w-full items-center justify-center">
                <div className="loader" />
            </div>
        )
    }

    const heroName = displayName && !isRawUserId(displayName) ? displayName : user?.firstName || 'there'

    return (
        <div className="mx-auto w-full max-w-[1200px] px-6 py-8 flex flex-col lg:flex-row gap-8 lg:gap-12">
            {/* Rail — on the canvas, no bordered boxes (§5.1). Collapses to a
                top strip on mobile. */}
            <aside className="shrink-0 lg:w-52 flex flex-col gap-6">
                <div id="shop-name">
                    <span className="dash-label">Your shop</span>
                    {displayNameAvailable ? (
                        editingName ? (
                            <div className="mt-1 flex flex-col gap-2">
                                <input
                                    autoFocus
                                    value={nameDraft}
                                    onChange={(e) => {
                                        setNameDraft(e.target.value)
                                        setDisplayNameSaved(false)
                                    }}
                                    placeholder="e.g. Lorem Ipsum"
                                    className="w-full rounded-[var(--dash-r-inner)] border border-[var(--dash-line)] bg-[var(--dash-card)] px-3 py-1.5 text-[13px]"
                                />
                                {displayNameError && (
                                    <span className="dash-data" style={{ color: 'var(--dash-bad)' }}>{displayNameError}</span>
                                )}
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={saveDisplayName}
                                        disabled={savingDisplayName}
                                        className="dash-hoverable rounded-full border border-[var(--dash-line)] bg-[var(--dash-card)] px-3 py-1 text-[12px] font-medium cursor-pointer hover:bg-[var(--dash-canvas)] disabled:opacity-50"
                                    >
                                        {savingDisplayName ? 'Saving…' : 'Save'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingName(false)
                                            setDisplayNameError('')
                                        }}
                                        className="text-[12px] dash-soft hover:text-[var(--dash-ink)] cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-1 group flex items-center gap-1.5 min-w-0">
                                <span className={`text-[15px] font-semibold truncate ${displayName ? '' : 'dash-soft'}`}>
                                    {displayName || 'Name your shop'}
                                </span>
                                <button
                                    type="button"
                                    aria-label="Edit shop display name"
                                    onClick={() => {
                                        setNameDraft(displayName)
                                        setEditingName(true)
                                        setDisplayNameSaved(false)
                                    }}
                                    className="dash-hoverable shrink-0 rounded-full h-6 w-6 grid place-items-center text-[var(--dash-ink-soft)] cursor-pointer opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-[var(--dash-ink)] hover:bg-[var(--dash-card)]"
                                >
                                    <IoPencilOutline size={13} />
                                </button>
                                {displayNameSaved && !displayNameError && (
                                    <span className="dash-data dash-soft shrink-0">Saved</span>
                                )}
                            </div>
                        )
                    ) : (
                        <p className="mt-1 text-[15px] font-semibold truncate">{user?.firstName || 'Creator'}</p>
                    )}
                </div>

                <nav className="flex flex-row lg:flex-col flex-wrap gap-1 -mx-3 lg:mx-0">
                    {NAV_LINKS.map((link) =>
                        link.active ? (
                            <span
                                key={link.href}
                                aria-current="page"
                                className="rounded-full bg-[var(--dash-ink)] text-[var(--dash-canvas)] px-3 py-1.5 text-[13px] font-medium w-fit lg:w-full"
                            >
                                {link.label}
                            </span>
                        ) : (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="dash-hoverable rounded-full px-3 py-1.5 text-[13px] dash-soft hover:text-[var(--dash-ink)] hover:bg-[var(--dash-card)] w-fit lg:w-full"
                            >
                                {link.label}
                            </Link>
                        ),
                    )}
                </nav>

                {isAdmin && (
                    <Link
                        href="/admin"
                        className="lg:mt-auto px-3 lg:px-3 -mx-3 lg:mx-0 text-[12px] dash-soft hover:text-[var(--dash-ink)] w-fit"
                    >
                        Admin dashboard →
                    </Link>
                )}
            </aside>

            {/* Main column */}
            <main className="flex-1 min-w-0 flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-2">
                    <HeroGreeting
                        salutation={salutationFor(new Date().getHours())}
                        name={heroName}
                        context={`${dayjs().format('dddd D MMMM YYYY')} · ${ordersThisMonth} order${ordersThisMonth === 1 ? '' : 's'} this month`}
                    />
                    {attention.length > 0 && (
                        <div className="md:max-w-[280px] shrink-0">
                            <span className="dash-label">Needs attention</span>
                            <ul className="mt-1.5 flex flex-col gap-1">
                                {attention.map((row) => (
                                    <li key={row.key}>
                                        <Link
                                            href={row.href}
                                            className="flex items-center gap-2 text-[13px] hover:underline"
                                        >
                                            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[var(--dash-ink)] shrink-0" />
                                            <span className="truncate">{row.label}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Setup checklist (§6) — below needs-attention, above analytics. */}
                <SetupChecklist
                    user={user}
                    isLoaded={isLoaded}
                    displayName={displayName}
                    hasProduct={myProducts.length > 0}
                    hasSale={orders.length > 0}
                />

                {/* Tile grid — first-mount stagger only (§4.5). */}
                <motion.div
                    variants={staggerParent}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 md:grid-cols-3 gap-4"
                >
                    <motion.div variants={staggerChild} className="md:col-span-2 md:row-span-3 min-w-0">
                        <RevenueCard products={myProducts} prefix={prefix} />
                    </motion.div>
                    <motion.div variants={staggerChild} className="min-w-0">
                        <StatTile
                            label="Gross volume"
                            value={`${prefix}${formatMoney(grossThisMonth)}`}
                            variant="ink"
                            delta={grossDelta}
                            hint="this month"
                        />
                    </motion.div>
                    <motion.div variants={staggerChild} className="min-w-0">
                        <StatTile label="Orders" value={orders.length} hint="all time" />
                    </motion.div>
                    <motion.div variants={staggerChild} className="min-w-0">
                        <DashCard className="h-full">
                            <span className="dash-label">Shop pulse</span>
                            <SegmentPill
                                className="mt-3"
                                segments={[
                                    { label: 'Likes', value: totalLikes, tone: 'sun' },
                                    { label: 'Downloads', value: totalDownloads, tone: 'ink' },
                                    { label: 'Products', value: myProducts.length, tone: 'hatch' },
                                ]}
                            />
                            <p className="dash-data dash-soft mt-3">
                                Avg rating {avgRating ?? '—'} · joined {user?.createdAt ? dayjs(user.createdAt).fromNow(true) : 'recently'} ago
                            </p>
                        </DashCard>
                    </motion.div>
                </motion.div>

                <div id="orders">
                    <OrdersLedger
                        orders={orders}
                        prefix={prefix}
                        updatedAt={ordersUpdatedAt}
                        onPatch={(orderId, patch) =>
                            setOrders((prev) => prev.map((o) => (o.orderId === orderId ? { ...o, ...patch } : o)))
                        }
                    />
                </div>

                <div id="stripe-payouts">
                    <ExpressWidget user={user} isLoaded={isLoaded} />
                </div>
            </main>
        </div>
    )
}

export default Dashboard
