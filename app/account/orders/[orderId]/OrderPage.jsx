'use client'
// Customer order detail on the "Sunlit Paper" language, composed per the
// reference images (docs/account-ui-reference-images/order-details.png +
// order-progress.png): a facts strip (Order placed / Delivered / Order ID /
// Payment method), an icon-step progress timeline driven by statusHistory
// (done = ink fill, current = sun fill, future = hatch; honest single-status
// fallback when no history exists), thumbnail item rows, a cost summary
// column, and shipping/billing address blocks. All fetches are unchanged from
// the legacy page (order, admin status settings, product, Stripe payment
// method). A Print button + scoped print CSS make the page a cheap invoice.
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import dayjs from 'dayjs'
import {
    IoBagCheckOutline,
    IoConstructOutline,
    IoCopyOutline,
    IoCubeOutline,
    IoHomeOutline,
    IoPrintOutline,
} from 'react-icons/io5'
import { useToast } from '@/components/General/ToastProvider'
import AccountShell from '@/components/Account/AccountShell'
import { orderTone, money } from '@/components/Account/accountUi'
import { ActionIcon, DashCard, DottedRow, EmptyState, StatusPill, Timeline, SkeletonTile } from '@/components/dashboard-ui'

// The canonical fulfilment flow, mapped from the real status set
// (models/User.js). Statuses outside this flow (cancelled, refunds, holds)
// fall back to the honest status-pill + raw history view.
const FLOW_STEPS = [
    {
        key: 'confirmed',
        matches: ['pending', 'confirmed'],
        icon: IoBagCheckOutline,
        title: 'Order confirmed',
        desc: 'Order placed and payment received.',
    },
    {
        key: 'processing',
        matches: ['processing', 'printing', 'printed'],
        icon: IoConstructOutline,
        title: 'Processing',
        desc: 'Your items are being prepared.',
    },
    {
        key: 'shipped',
        matches: ['shipped'],
        icon: IoCubeOutline,
        title: 'Shipped',
        desc: 'Handed to the courier.',
    },
    {
        key: 'delivered',
        matches: ['delivered'],
        icon: IoHomeOutline,
        title: 'Delivered',
        desc: 'Package delivered to you.',
    },
]
const EXCEPTION_STATUSES = new Set(['cancelled', 'refunded', 'partially_refunded', 'failed', 'on_hold'])

const STEP_CIRCLE = {
    done: 'bg-[var(--dash-ink)] text-[var(--dash-canvas)]',
    current: 'bg-[var(--dash-sun)] text-[var(--dash-ink)]',
    future: 'dash-hatch bg-[var(--dash-card)] border border-[var(--dash-line)] text-[var(--dash-ink-faint)]',
}

// Icon-step progress per order-progress.png: hairline-connected circles,
// per-step plain-language description, timestamp when the history knows it.
function OrderProgressSteps({ order, currentIndex }) {
    const history = order.statusHistory || []
    const stampFor = (step) => {
        const entry = history.find((h) => step.matches.includes(h.status))
        if (entry?.timestamp) return entry.timestamp
        // The confirmed step is implied by the order existing at all.
        if (step.key === 'confirmed' && order.createdAt) return order.createdAt
        return null
    }
    return (
        <ol className="flex flex-col">
            {FLOW_STEPS.map((step, i) => {
                const state = i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'future'
                const at = state === 'future' ? null : stampFor(step)
                const Icon = step.icon
                return (
                    <li key={step.key} className="flex gap-3">
                        <div className="flex flex-col items-center">
                            <span
                                aria-hidden="true"
                                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${STEP_CIRCLE[state]}`}
                            >
                                <Icon size={16} />
                            </span>
                            {i < FLOW_STEPS.length - 1 && (
                                <span aria-hidden="true" className="w-px flex-1 min-h-3 bg-[var(--dash-line)]" />
                            )}
                        </div>
                        <div className={`min-w-0 flex-1 pt-1 ${i < FLOW_STEPS.length - 1 ? 'pb-5' : ''}`}>
                            <div className="flex items-baseline justify-between gap-3">
                                <p className={`text-[13px] ${state === 'current' ? 'font-medium' : state === 'done' ? '' : 'dash-soft'}`}>
                                    {step.title}
                                </p>
                                {at && (
                                    <time className="dash-data dash-soft shrink-0">
                                        {dayjs(at).format('D MMM, HH:mm')}
                                    </time>
                                )}
                            </div>
                            <p className="dash-data dash-soft mt-0.5">{step.desc}</p>
                        </div>
                    </li>
                )
            })}
        </ol>
    )
}

// Product thumbnail with a quiet fallback tile, never a broken img.
function ItemThumb({ product, title, isCustomPrint, size = 56 }) {
    const imageKey = product?.images?.[0]
    const boxCls =
        'shrink-0 overflow-hidden rounded-[var(--dash-r-inner)] border border-[var(--dash-line)] bg-[var(--dash-canvas)]'
    if (imageKey) {
        return (
            <div className={boxCls} style={{ height: size, width: size }}>
                <Image
                    src={`/api/proxy?key=${encodeURIComponent(imageKey)}`}
                    alt={title || 'Product'}
                    width={size}
                    height={size}
                    className="object-cover h-full w-full"
                />
            </div>
        )
    }
    return (
        <div
            className={`${boxCls} grid place-items-center text-[var(--dash-ink-faint)]`}
            style={{ height: size, width: size }}
            role="img"
            aria-label={title || 'Product'}
        >
            {isCustomPrint ? (
                <IoCubeOutline size={18} aria-hidden="true" />
            ) : (
                <span className="text-[15px] font-medium">{(title || '?').charAt(0).toUpperCase()}</span>
            )}
        </div>
    )
}

function OrderPage({ orderId }) {
    const [order, setOrder] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [orderStatuses, setOrderStatuses] = useState([])
    const [product, setProduct] = useState(null)
    const [paymentMethod, setPaymentMethod] = useState(null)
    const [customerDetails, setCustomerDetails] = useState(null)
    const { showToast } = useToast()

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                // Fetch order data
                const orderRes = await fetch(`/api/user/orders?orderId=${orderId}`)
                const orderData = await orderRes.json()

                if (!orderRes.ok) {
                    throw new Error(orderData.error || 'Order not found')
                }

                const statusRes = await fetch('/api/admin/settings')
                const statusData = await statusRes.json()

                // Fetch product details if productId exists
                if (orderData.order.cartItem?.productId) {
                    try {
                        const productRes = await fetch(`/api/product?ids=${orderData.order.cartItem.productId}`)
                        const productData = await productRes.json()
                        if (productData.products && productData.products.length > 0) {
                            setProduct(productData.products[0])
                        }
                    } catch (err) {
                        console.error('Error fetching product:', err)
                    }
                }

                // Set user details from API response. userDetails.contact is the
                // saved account address (the shipping fallback when the order
                // subdocument carries no address of its own).
                if (orderData.userDetails) {
                    setCustomerDetails({
                        name: orderData.userDetails.name,
                        email: orderData.userDetails.email,
                        phone: orderData.userDetails.phone,
                        savedContact: orderData.userDetails.contact || null,
                    })
                }

                // Fetch payment method from Stripe if sessionId exists
                if (orderData.order.stripeSessionId) {
                    try {
                        const paymentRes = await fetch(
                            `/api/checkout/payment-method?sessionId=${orderData.order.stripeSessionId}`,
                        )
                        if (paymentRes.ok) {
                            const paymentData = await paymentRes.json()
                            setPaymentMethod(paymentData.paymentMethod)
                            if (paymentData.customerDetails?.address) {
                                setCustomerDetails((prev) => ({
                                    ...prev,
                                    address: paymentData.customerDetails.address,
                                }))
                            }
                        }
                    } catch (err) {
                        console.error('Error fetching payment method:', err)
                    }
                }

                setOrder(orderData.order)
                setOrderStatuses(statusData.orderStatuses || [])
                setLoading(false)
            } catch (err) {
                console.error('Error fetching order:', err)
                setError(err.message)
                setLoading(false)
            }
        }

        fetchOrder()
    }, [orderId])

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text)
            showToast('Copied to clipboard!', 'success')
        } catch (err) {
            showToast('Failed to copy', 'error')
        }
    }

    const getStatusInfo = (statusKey) => {
        const status = orderStatuses.find((s) => s.statusKey === statusKey)
        return (
            status || {
                displayName: statusKey.charAt(0).toUpperCase() + statusKey.slice(1).replace(/_/g, ' '),
            }
        )
    }

    const shortId = order ? order._id.toString().slice(-8).toUpperCase() : ''

    const header = (
        <div>
            <Link
                href="/account?tab=orders"
                className="dash-print-hidden text-[12px] font-medium dash-soft hover:text-[var(--dash-ink)]"
            >
                Back to orders
            </Link>
            <h1 className="dash-title mt-2">{order ? `Order #${shortId}` : 'Your order'}</h1>
            {order && (
                <p className="dash-data dash-soft mt-1">
                    Placed on {dayjs(order.createdAt).format('D MMMM YYYY')}
                </p>
            )}
        </div>
    )

    if (loading) {
        return (
            <AccountShell active="orders" header={header}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <SkeletonTile className="lg:col-span-3 h-[88px]" />
                    <SkeletonTile className="lg:col-span-2 h-[220px]" />
                    <SkeletonTile className="h-[220px]" />
                </div>
            </AccountShell>
        )
    }

    if (error) {
        return (
            <AccountShell active="orders" header={header}>
                <div className="bg-[var(--dash-card)] border border-[var(--dash-line)] rounded-[var(--dash-r-card)]">
                    <EmptyState title="Order Not Available" body={error} />
                </div>
            </AccountShell>
        )
    }

    const cartItem = order.cartItem || {}
    const isCustomPrint =
        Boolean(cartItem.requestId) || String(cartItem.productId || '').startsWith('custom-print:')
    const displayTitle = isCustomPrint
        ? `Custom 3D Print${cartItem.requestId ? ` - ${cartItem.requestId}` : ''}`
        : product?.name || cartItem.productId

    const statusHistory = order.statusHistory || []
    const hasHistory = statusHistory.length > 0
    const isException = EXCEPTION_STATUSES.has(order.status)
    const currentStepIndex = FLOW_STEPS.findIndex((s) => s.matches.includes(order.status))
    const showStepper = hasHistory && !isException && currentStepIndex >= 0

    // Delivered date is only shown when the history really carries it.
    const deliveredAt = statusHistory.find((h) => h.status === 'delivered')?.timestamp

    // Raw history for the exception fallback, newest first.
    const timelineItems = [...statusHistory]
        .reverse()
        .map((historyItem, index) => ({
            id: index,
            title: getStatusInfo(historyItem.status).displayName,
            at: historyItem.timestamp,
        }))

    const paymentLabel = paymentMethod
        ? paymentMethod.type === 'card'
            ? null // rendered richer below
            : paymentMethod.type === 'paynow'
              ? 'PayNow'
              : paymentMethod.type === 'grabpay'
                ? 'GrabPay'
                : 'Stripe Checkout'
        : 'Stripe Checkout'

    const shippingAddress = order.contact?.address || customerDetails?.savedContact?.address || null
    const shippingPhone = order.contact?.phone || customerDetails?.savedContact?.phone || null

    return (
        <AccountShell active="orders" header={header}>
            {/* Print-friendly order summary: printing this page shows only the
                order content (facts, progress, items, totals, addresses). */}
            <style>{`@media print {
                body * { visibility: hidden; }
                #order-print-area, #order-print-area * { visibility: visible; }
                #order-print-area { position: absolute; left: 0; top: 0; width: 100%; }
            }`}</style>
            <div id="order-print-area" className="flex flex-col gap-4">
                {/* Facts strip: order date, delivered date (when known), order ID, payment method. */}
                <DashCard>
                    <div className="flex flex-wrap items-center gap-y-3">
                        <div className="pr-6 mr-6 border-r border-[var(--dash-line)]">
                            <p className="dash-label">Order placed</p>
                            <p className="dash-data mt-0.5">{dayjs(order.createdAt).format('D MMM YYYY')}</p>
                        </div>
                        {deliveredAt && (
                            <div className="pr-6 mr-6 border-r border-[var(--dash-line)]">
                                <p className="dash-label">Delivered</p>
                                <p className="dash-data mt-0.5">{dayjs(deliveredAt).format('D MMM YYYY')}</p>
                            </div>
                        )}
                        <div className="pr-6 mr-6 border-r border-[var(--dash-line)]">
                            <p className="dash-label">Order ID</p>
                            <p className="dash-data mt-0.5 flex items-center gap-1.5">
                                <span className="font-mono">#{shortId}</span>
                                <ActionIcon
                                    icon={IoCopyOutline}
                                    label="Copy order ID"
                                    onClick={() => copyToClipboard(order._id)}
                                    className="dash-print-hidden h-6 w-6"
                                />
                            </p>
                        </div>
                        <div>
                            <p className="dash-label">Payment method</p>
                            <p className="dash-data mt-0.5">
                                {paymentMethod?.type === 'card' ? (
                                    <span className="flex items-center gap-1.5">
                                        <span className="capitalize">{paymentMethod.card?.brand || 'Card'}</span>
                                        <span className="font-mono">•••• {paymentMethod.card?.last4}</span>
                                    </span>
                                ) : (
                                    paymentLabel
                                )}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="dash-print-hidden dash-hoverable ml-auto inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--dash-line)] bg-[var(--dash-card)] px-3.5 text-[12px] font-medium dash-soft hover:text-[var(--dash-ink)] hover:bg-[var(--dash-canvas)] cursor-pointer"
                        >
                            <IoPrintOutline size={14} aria-hidden="true" />
                            Print summary
                        </button>
                    </div>
                </DashCard>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                    <div className="lg:col-span-2 flex flex-col gap-4">
                        {/* Progress */}
                        <DashCard
                            title="Order progress"
                            action={
                                <StatusPill tone={orderTone(order.status)}>
                                    {getStatusInfo(order.status).displayName}
                                </StatusPill>
                            }
                        >
                            {order.trackingId && (
                                <div className="mb-4">
                                    <DottedRow label="Tracking ID">
                                        <span className="font-mono">{order.trackingId}</span>
                                        <ActionIcon
                                            icon={IoCopyOutline}
                                            label="Copy tracking ID"
                                            onClick={() => copyToClipboard(order.trackingId)}
                                            className="dash-print-hidden h-6 w-6"
                                        />
                                    </DottedRow>
                                </div>
                            )}

                            {showStepper ? (
                                <OrderProgressSteps order={order} currentIndex={currentStepIndex} />
                            ) : hasHistory ? (
                                <Timeline items={timelineItems} />
                            ) : (
                                <p className="text-[13px] dash-soft">
                                    This is the current status of your order. A step-by-step history will
                                    appear here as it progresses.
                                </p>
                            )}
                        </DashCard>

                        {/* Items */}
                        <DashCard title="Items">
                            <div className="flex flex-wrap items-center gap-3">
                                <ItemThumb product={product} title={displayTitle} isCustomPrint={isCustomPrint} />
                                <div className="min-w-0 flex-1">
                                    <p className="text-[13px] font-medium truncate">{displayTitle}</p>
                                    {cartItem.selectedVariants &&
                                        Object.keys(cartItem.selectedVariants).length > 0 && (
                                            <p className="dash-data dash-soft mt-0.5 truncate">
                                                {Object.entries(cartItem.selectedVariants)
                                                    .map(([type, option]) => `${type}: ${option}`)
                                                    .join(', ')}
                                            </p>
                                        )}
                                    <p className="dash-data dash-soft mt-0.5">Qty {cartItem.quantity || 1}</p>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="dash-data font-medium">
                                        {cartItem.currency || 'S'}$
                                        {money((cartItem.price || 0) * (cartItem.quantity || 1))}
                                    </p>
                                    {(cartItem.quantity || 1) > 1 && (
                                        <p className="dash-data dash-soft mt-0.5">
                                            {cartItem.currency || 'S'}${money(cartItem.price || 0)} each
                                        </p>
                                    )}
                                </div>
                            </div>
                            {product?.slug && !isCustomPrint && (
                                <div className="dash-print-hidden mt-4 pt-3 border-t border-[var(--dash-line)] flex items-center gap-2">
                                    <Link
                                        href={`/products/${product.slug}`}
                                        className="dash-hoverable inline-flex h-7 items-center rounded-full border border-[var(--dash-line)] bg-[var(--dash-card)] px-3 text-[12px] font-medium dash-soft hover:text-[var(--dash-ink)] hover:bg-[var(--dash-canvas)]"
                                    >
                                        Buy it again
                                    </Link>
                                    {order.status === 'delivered' && (
                                        <Link
                                            href={`/products/${product.slug}#reviews`}
                                            className="text-[12px] font-medium dash-soft hover:text-[var(--dash-ink)]"
                                        >
                                            Rate your experience
                                        </Link>
                                    )}
                                </div>
                            )}
                            {isCustomPrint && (
                                <div className="dash-print-hidden mt-4 pt-3 border-t border-[var(--dash-line)]">
                                    <Link
                                        href="/account/prints"
                                        className="dash-hoverable inline-flex h-7 items-center rounded-full border border-[var(--dash-line)] bg-[var(--dash-card)] px-3 text-[12px] font-medium dash-soft hover:text-[var(--dash-ink)] hover:bg-[var(--dash-canvas)]"
                                    >
                                        Track custom print
                                    </Link>
                                </div>
                            )}
                        </DashCard>

                        {cartItem.orderNote && (
                            <section className="bg-[var(--dash-sun-soft)] rounded-[var(--dash-r-inner)] px-3 py-2.5">
                                <h4 className="dash-label">Your note</h4>
                                <p className="mt-1 text-[13px] whitespace-pre-wrap leading-relaxed">
                                    {cartItem.orderNote}
                                </p>
                            </section>
                        )}
                    </div>

                    <div className="flex flex-col gap-4">
                        {/* Cost summary */}
                        <DashCard title="Order summary">
                            <DottedRow label="Subtotal">
                                {cartItem.currency || 'S'}$
                                {money((cartItem.finalPrice || cartItem.price || 0) * (cartItem.quantity || 1))}
                            </DottedRow>
                            {cartItem.deliveryFee > 0 && (
                                <DottedRow label={`Shipping (${cartItem.chosenDeliveryType})`}>
                                    {cartItem.currency || 'S'}${money(cartItem.deliveryFee)}
                                </DottedRow>
                            )}
                            {cartItem.priceBeforeDiscount &&
                                cartItem.finalPrice &&
                                cartItem.priceBeforeDiscount !== cartItem.finalPrice && (
                                    <DottedRow label="Discount">
                                        <span className="text-[var(--dash-ok)]">
                                            -{cartItem.currency || 'S'}$
                                            {money(
                                                (cartItem.priceBeforeDiscount - cartItem.finalPrice) *
                                                    (cartItem.quantity || 1),
                                            )}
                                        </span>
                                    </DottedRow>
                                )}
                            <div className="mt-1 pt-1 border-t border-[var(--dash-line)]">
                                <DottedRow label="Total">
                                    <span className="font-medium">
                                        {cartItem.currency || 'S'}$
                                        {money((cartItem.price || 0) * (cartItem.quantity || 1))}
                                    </span>
                                </DottedRow>
                            </div>
                        </DashCard>

                        {/* Shipping & contact */}
                        <DashCard title="Shipping">
                            <div className="flex flex-col gap-4">
                                {shippingAddress && (
                                    <section>
                                        <h4 className="dash-label mb-1">Shipping address</h4>
                                        <div className="text-[13px] bg-[var(--dash-canvas)] border border-[var(--dash-line)] rounded-[var(--dash-r-inner)] px-3 py-2.5 leading-relaxed">
                                            {shippingAddress.street && <p>{shippingAddress.street}</p>}
                                            {shippingAddress.unitNumber && (
                                                <p className="dash-soft">Unit: {shippingAddress.unitNumber}</p>
                                            )}
                                            <p>
                                                {[
                                                    shippingAddress.city,
                                                    shippingAddress.state,
                                                    shippingAddress.postalCode,
                                                ]
                                                    .filter(Boolean)
                                                    .join(', ')}
                                            </p>
                                            {shippingAddress.country && (
                                                <p className="font-medium">{shippingAddress.country}</p>
                                            )}
                                            {shippingPhone && (
                                                <p className="mt-2 pt-2 border-t border-[var(--dash-line)] dash-soft">
                                                    Contact: {shippingPhone.countryCode} {shippingPhone.number}
                                                </p>
                                            )}
                                        </div>
                                    </section>
                                )}

                                {customerDetails?.address && (
                                    <section>
                                        <h4 className="dash-label mb-1">Billing address</h4>
                                        <div className="text-[13px] bg-[var(--dash-canvas)] border border-[var(--dash-line)] rounded-[var(--dash-r-inner)] px-3 py-2.5 leading-relaxed">
                                            {customerDetails.address.line1 && <p>{customerDetails.address.line1}</p>}
                                            {customerDetails.address.line2 && (
                                                <p className="dash-soft">{customerDetails.address.line2}</p>
                                            )}
                                            <p>
                                                {[
                                                    customerDetails.address.city,
                                                    customerDetails.address.state,
                                                    customerDetails.address.postal_code,
                                                ]
                                                    .filter(Boolean)
                                                    .join(', ')}
                                            </p>
                                            {customerDetails.address.country && (
                                                <p className="font-medium uppercase dash-data">
                                                    {customerDetails.address.country}
                                                </p>
                                            )}
                                        </div>
                                    </section>
                                )}

                                <div>
                                    <DottedRow label="Shipping method">
                                        <span className="capitalize">
                                            {cartItem.chosenDeliveryType || 'Standard Delivery'}
                                        </span>
                                    </DottedRow>
                                    {(customerDetails?.name || customerDetails?.email || customerDetails?.phone) && (
                                        <>
                                            {customerDetails?.name && (
                                                <DottedRow label="Name">{customerDetails.name}</DottedRow>
                                            )}
                                            {customerDetails?.email && (
                                                <DottedRow label="Email">
                                                    <span className="break-all">{customerDetails.email}</span>
                                                </DottedRow>
                                            )}
                                            {customerDetails?.phone && (
                                                <DottedRow label="Phone">{customerDetails.phone}</DottedRow>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </DashCard>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <p className="dash-data dash-soft">
                        Need help? Contact support with your order ID:{' '}
                        <span className="font-mono font-medium text-[var(--dash-ink)]">{shortId}</span>
                    </p>
                    <ActionIcon
                        icon={IoCopyOutline}
                        label="Copy order ID for support"
                        onClick={() => copyToClipboard(shortId)}
                        className="dash-print-hidden h-6 w-6"
                    />
                </div>
            </div>
        </AccountShell>
    )
}

export default OrderPage
