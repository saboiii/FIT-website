'use client'
// Order history as a date-grouped ledger (blueprint §4.8 #5, mirroring the
// creator OrdersLedger): white collapsible day strips, internal scroll cap,
// one StatusPill per row, and a PeekPanel with the full order detail plus a
// link to the order page. All legacy fields (variants, fees, discounts,
// notes, delivery, custom-print tracking) live in the peek. Fetch logic is
// unchanged: /api/user/orders then /api/product?ids=.
import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { IoChevronDownOutline, IoCopyOutline } from 'react-icons/io5'
import { DottedRow, EmptyState, PeekPanel, StatusPill, SkeletonRow } from '@/components/dashboard-ui'
import { useOrderStatuses, getStatusDisplayName } from '@/utils/useOrderStatuses'
import { useToast } from '../General/ToastProvider'
import { orderTone, money } from './accountUi'

const LEDGER_COLS = 'minmax(0, 2.6fr) minmax(36px, 0.5fr) minmax(76px, 0.9fr) minmax(92px, 1fr)'

function OrderSection() {
    const [orders, setOrders] = useState([])
    const [products, setProducts] = useState({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [selected, setSelected] = useState(null)
    const [collapsedDays, setCollapsedDays] = useState(() => new Set())
    const { orderStatuses } = useOrderStatuses() // Get all order statuses
    const { showToast } = useToast()

    const isObjectIdString = (value) => typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value)

    useEffect(() => {
        ;(async () => {
            setLoading(true)
            setError('')
            try {
                // Fetch orders
                const ordersRes = await fetch('/api/user/orders')
                if (!ordersRes.ok) throw new Error('Failed to fetch orders')
                const ordersData = await ordersRes.json()
                const ordersArr = ordersData.orders || []
                setOrders(ordersArr)

                const productIds = [
                    ...new Set(
                        ordersArr
                            .map((order) => order.cartItem?.productId)
                            .filter(Boolean)
                            .filter(isObjectIdString),
                    ),
                ]

                let productsMap = {}
                if (productIds.length > 0) {
                    const prodRes = await fetch(`/api/product?ids=${productIds.join(',')}`)
                    if (prodRes.ok) {
                        const prodData = await prodRes.json()
                        ;(prodData.products || []).forEach((prod) => {
                            productsMap[prod._id] = prod
                        })
                    }
                }
                setProducts(productsMap)
            } catch (err) {
                setError(err.message || 'Failed to load orders.')
            }
            setLoading(false)
        })()
    }, [])

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text)
            showToast('Copied to clipboard!', 'success')
        } catch (err) {
            showToast('Failed to copy', 'error')
        }
    }

    const decorate = (order) => {
        const cartItem = order.cartItem || {}
        const isCustomPrint =
            Boolean(cartItem.requestId) || String(cartItem.productId || '').startsWith('custom-print:')
        const product = products[cartItem.productId] || {}
        const displayTitle = isCustomPrint
            ? `Custom 3D Print${cartItem.requestId ? ` - ${cartItem.requestId}` : ''}`
            : product.name || cartItem.productId
        return { order, cartItem, isCustomPrint, product, displayTitle }
    }

    const sorted = useMemo(
        () => [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
        [orders],
    )

    const groups = useMemo(() => {
        const byDay = []
        sorted.forEach((order) => {
            const key = dayjs(order.createdAt).format('YYYY-MM-DD')
            let group = byDay.find((g) => g.key === key)
            if (!group) {
                group = { key, label: dayjs(order.createdAt).format('D MMM YYYY'), orders: [] }
                byDay.push(group)
            }
            group.orders.push(order)
        })
        return byDay
    }, [sorted])

    const toggleDay = (key) =>
        setCollapsedDays((prev) => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })

    const peek = selected ? decorate(selected) : null
    const variantFees = peek?.cartItem?.variantInfo
        ? peek.cartItem.variantInfo.reduce((sum, v) => sum + (v.additionalFee || 0), 0)
        : 0

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="dash-title">Orders</h2>
                <p className="text-[13px] dash-soft mt-1">
                    Your past orders, grouped by day. Select one for the full detail.
                </p>
            </div>

            {loading && (
                <div className="flex flex-col gap-2">
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                </div>
            )}
            {error && <p className="text-[12px] font-medium text-[var(--dash-bad)]">{error}</p>}

            {!loading && !error && sorted.length === 0 && (
                <div className="bg-[var(--dash-card)] border border-[var(--dash-line)] rounded-[var(--dash-r-card)]">
                    <EmptyState
                        title="No Orders Yet"
                        body="Everything you buy shows up here with live status."
                        secondary="Browse the shop"
                        onSecondary={() => {
                            window.location.href = '/shop'
                        }}
                    />
                </div>
            )}

            {!loading && sorted.length > 0 && (
                <section className="bg-[var(--dash-card)] border border-[var(--dash-line)] rounded-[var(--dash-r-card)] shadow-[var(--dash-shadow-card)] overflow-hidden">
                    <div className="grid px-5 py-2" style={{ gridTemplateColumns: LEDGER_COLS }}>
                        <span className="dash-label">Order</span>
                        <span className="dash-label text-right">Qty</span>
                        <span className="dash-label text-right">Total</span>
                        <span className="dash-label text-right">Status</span>
                    </div>

                    {/* The ledger scrolls inside itself past a max height. */}
                    <div className="max-h-[560px] dash-scroll">
                        {groups.map((group) => {
                            const collapsed = collapsedDays.has(group.key)
                            return (
                                <section key={group.key}>
                                    <button
                                        type="button"
                                        onClick={() => toggleDay(group.key)}
                                        aria-expanded={!collapsed}
                                        className="dash-hoverable sticky top-0 z-10 flex w-full items-center gap-2 border-y border-[var(--dash-line)] bg-[var(--dash-card)] px-5 py-2 text-left cursor-pointer hover:bg-[var(--dash-canvas)]"
                                    >
                                        <IoChevronDownOutline
                                            size={13}
                                            aria-hidden="true"
                                            className={`shrink-0 text-[var(--dash-ink-soft)] ${collapsed ? '-rotate-90' : ''}`}
                                        />
                                        <span className="dash-label">{group.label}</span>
                                        <span className="dash-data dash-soft ml-auto">
                                            {group.orders.length} order{group.orders.length === 1 ? '' : 's'}
                                        </span>
                                    </button>

                                    {!collapsed && (
                                        <div className="divide-y divide-[var(--dash-line)]">
                                            {group.orders.map((order) => {
                                                const { cartItem, displayTitle } = decorate(order)
                                                return (
                                                    <button
                                                        key={order._id}
                                                        type="button"
                                                        onClick={() => setSelected(order)}
                                                        className={`dash-hoverable grid w-full items-center px-5 py-2.5 text-left cursor-pointer hover:bg-[var(--dash-canvas)] ${
                                                            selected?._id === order._id ? 'bg-[var(--dash-sun-soft)]' : ''
                                                        }`}
                                                        style={{ gridTemplateColumns: LEDGER_COLS }}
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="text-[13px] font-medium truncate">{displayTitle}</p>
                                                            <p className="dash-data dash-soft truncate">
                                                                #{order._id?.slice(-8).toUpperCase() || 'N/A'}
                                                            </p>
                                                        </div>
                                                        <span className="dash-data text-right">{cartItem.quantity}</span>
                                                        <span className="dash-data text-right">
                                                            {cartItem.currency || 'S'}$
                                                            {money((cartItem.price || 0) * (cartItem.quantity || 1))}
                                                        </span>
                                                        <span className="text-right">
                                                            <StatusPill tone={orderTone(order.status)}>
                                                                {getStatusDisplayName(order.status, orderStatuses)}
                                                            </StatusPill>
                                                        </span>
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )}
                                </section>
                            )
                        })}
                    </div>
                </section>
            )}

            <PeekPanel
                open={!!peek}
                onClose={() => setSelected(null)}
                title={peek ? `Order #${peek.order._id?.slice(-8).toUpperCase() || 'N/A'}` : ''}
                actions={
                    peek && (
                        <Link
                            href={`/account/orders/${peek.order._id}`}
                            className="dash-hoverable rounded-full bg-[var(--dash-ink)] text-[var(--dash-canvas)] px-3.5 py-1.5 text-[12px] font-medium whitespace-nowrap"
                        >
                            View full order
                        </Link>
                    )
                }
            >
                {peek && (
                    <div className="flex flex-col gap-6">
                        <section className="flex flex-wrap items-center gap-2">
                            <StatusPill tone={orderTone(peek.order.status)}>
                                {getStatusDisplayName(peek.order.status, orderStatuses)}
                            </StatusPill>
                            {/* Print status for print orders, when it diverges. */}
                            {peek.order.orderType === 'printOrder' &&
                                peek.order.printStatus &&
                                peek.order.printStatus !== peek.order.status && (
                                    <StatusPill tone={orderTone(peek.order.printStatus)}>
                                        Print: {getStatusDisplayName(peek.order.printStatus, orderStatuses)}
                                    </StatusPill>
                                )}
                        </section>

                        <section className="flex gap-3 items-center">
                            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[var(--dash-r-inner)] border border-[var(--dash-line)] bg-[var(--dash-canvas)]">
                                <Image
                                    src={`/api/proxy?key=${encodeURIComponent(peek.product.images?.[0] || '/placeholder.jpg')}`}
                                    alt={peek.displayTitle || 'Product'}
                                    width={56}
                                    height={56}
                                    className="object-cover h-full w-full"
                                />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[13px] font-medium truncate">{peek.displayTitle}</p>
                                {peek.product.description && (
                                    <p className="dash-data dash-soft truncate">{peek.product.description}</p>
                                )}
                            </div>
                        </section>

                        <section>
                            <h4 className="dash-label mb-1">Order</h4>
                            <DottedRow label="Order ID">
                                <span className="font-mono">#{peek.order._id?.slice(-8).toUpperCase()}</span>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(peek.order._id)}
                                    title="Copy order ID"
                                    aria-label="Copy order ID"
                                    className="dash-hoverable rounded-full h-6 w-6 grid place-items-center border border-[var(--dash-line)] bg-[var(--dash-card)] cursor-pointer hover:bg-[var(--dash-canvas)] text-[var(--dash-ink-soft)] hover:text-[var(--dash-ink)]"
                                >
                                    <IoCopyOutline size={12} />
                                </button>
                            </DottedRow>
                            <DottedRow label="Placed">
                                {peek.order.createdAt ? dayjs(peek.order.createdAt).format('D MMM YYYY, HH:mm') : 'Unknown'}
                            </DottedRow>
                            <DottedRow label="Quantity">{peek.cartItem.quantity}</DottedRow>
                            <DottedRow label="Delivery">
                                <span className="capitalize">{peek.cartItem.chosenDeliveryType || 'Not specified'}</span>
                            </DottedRow>
                            {peek.order.trackingId && (
                                <DottedRow label="Tracking ID">
                                    <span className="font-mono">{peek.order.trackingId}</span>
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard(peek.order.trackingId)}
                                        title="Copy tracking ID"
                                        aria-label="Copy tracking ID"
                                        className="dash-hoverable rounded-full h-6 w-6 grid place-items-center border border-[var(--dash-line)] bg-[var(--dash-card)] cursor-pointer hover:bg-[var(--dash-canvas)] text-[var(--dash-ink-soft)] hover:text-[var(--dash-ink)]"
                                    >
                                        <IoCopyOutline size={12} />
                                    </button>
                                </DottedRow>
                            )}
                        </section>

                        {/* Selected options (new variant system) with their fees. */}
                        {peek.cartItem.selectedVariants && Object.keys(peek.cartItem.selectedVariants).length > 0 && (
                            <section>
                                <h4 className="dash-label mb-1">Options</h4>
                                {Object.entries(peek.cartItem.selectedVariants).map(([type, option]) => {
                                    const variantInfoItem = peek.cartItem.variantInfo?.find(
                                        (v) => v.type === type && v.option === option,
                                    )
                                    const fee = variantInfoItem?.additionalFee || 0
                                    return (
                                        <DottedRow key={type} label={type}>
                                            {option}
                                            {fee > 0 ? ` (+S$${money(fee)})` : ''}
                                        </DottedRow>
                                    )
                                })}
                            </section>
                        )}
                        {/* Legacy variant selection fallback. */}
                        {(!peek.cartItem.selectedVariants ||
                            Object.keys(peek.cartItem.selectedVariants).length === 0) &&
                            peek.cartItem.variantId && (
                                <section>
                                    <h4 className="dash-label mb-1">Options</h4>
                                    <DottedRow label="Variant">{peek.cartItem.variantId}</DottedRow>
                                </section>
                            )}

                        <section>
                            <h4 className="dash-label mb-1">Payment</h4>
                            {peek.cartItem.basePrice > 0 && (
                                <DottedRow label="Base price">S${money(peek.cartItem.basePrice)}</DottedRow>
                            )}
                            {variantFees > 0 && (
                                <DottedRow label="Option fees">+S${money(variantFees)}</DottedRow>
                            )}
                            {peek.cartItem.priceBeforeDiscount &&
                                peek.cartItem.finalPrice &&
                                peek.cartItem.priceBeforeDiscount !== peek.cartItem.finalPrice && (
                                    <DottedRow label="Discount">
                                        <span className="text-[var(--dash-ok)]">
                                            -
                                            {(
                                                ((peek.cartItem.priceBeforeDiscount - peek.cartItem.finalPrice) /
                                                    peek.cartItem.priceBeforeDiscount) *
                                                100
                                            ).toFixed(0)}
                                            %
                                        </span>
                                    </DottedRow>
                                )}
                            <DottedRow label="Paid">
                                {peek.cartItem.currency || 'S'}$
                                {money(
                                    (peek.cartItem.finalPrice || peek.cartItem.price || 0) *
                                        (peek.cartItem.quantity || 1),
                                )}
                            </DottedRow>
                            {peek.cartItem.deliveryFee > 0 && (
                                <DottedRow label="Delivery fee">
                                    +S${money(peek.cartItem.deliveryFee * (peek.cartItem.quantity || 1))}
                                </DottedRow>
                            )}
                            <DottedRow label="Total">
                                <span className="font-medium">
                                    {peek.cartItem.currency || 'S'}$
                                    {money((peek.cartItem.price || 0) * (peek.cartItem.quantity || 1))}
                                </span>
                            </DottedRow>
                        </section>

                        {peek.cartItem.orderNote && (
                            <section className="bg-[var(--dash-sun-soft)] rounded-[var(--dash-r-inner)] px-3 py-2.5">
                                <h4 className="dash-label">Your note</h4>
                                <p className="mt-1 text-[13px] whitespace-pre-wrap">{peek.cartItem.orderNote}</p>
                            </section>
                        )}

                        {peek.isCustomPrint && (
                            <Link
                                href="/account/prints"
                                className="dash-hoverable inline-flex w-fit items-center rounded-full border border-[var(--dash-line)] bg-[var(--dash-card)] px-3.5 py-1.5 text-[12px] font-medium dash-soft hover:text-[var(--dash-ink)] hover:bg-[var(--dash-canvas)]"
                            >
                                Track custom print
                            </Link>
                        )}

                        {/* Delivered shop orders get a one-tap route back to the product. */}
                        {peek.order.status === 'delivered' && peek.product?.slug && (
                            <Link
                                href={`/products/${peek.product.slug}`}
                                className="dash-hoverable inline-flex w-fit items-center rounded-full border border-[var(--dash-line)] bg-[var(--dash-card)] px-3.5 py-1.5 text-[12px] font-medium dash-soft hover:text-[var(--dash-ink)] hover:bg-[var(--dash-canvas)]"
                            >
                                Order again
                            </Link>
                        )}
                    </div>
                )}
            </PeekPanel>
        </div>
    )
}

export default OrderSection
