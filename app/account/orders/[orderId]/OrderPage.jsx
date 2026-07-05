'use client'
// Customer order detail on the "Sunlit Paper" language: a status Timeline
// derived from the order's statusHistory (clear status pill + explanation
// when no history exists), spec-sheet DottedRows for money, and quiet cards
// for contact/shipping/payment. All fetches are unchanged from the legacy
// page (order, admin status settings, product, Stripe payment method).
import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import dayjs from 'dayjs'
import { IoCopyOutline } from 'react-icons/io5'
import { useToast } from '@/components/General/ToastProvider'
import AccountShell from '@/components/Account/AccountShell'
import { orderTone, money } from '@/components/Account/accountUi'
import { DashCard, DottedRow, EmptyState, StatusPill, Timeline, SkeletonTile } from '@/components/dashboard-ui'

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

                // Set user details from API response
                if (orderData.userDetails) {
                    setCustomerDetails({
                        name: orderData.userDetails.name,
                        email: orderData.userDetails.email,
                        phone: orderData.userDetails.phone,
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
                className="text-[12px] font-medium dash-soft hover:text-[var(--dash-ink)]"
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
                    <SkeletonTile className="lg:col-span-2 h-[220px]" />
                    <SkeletonTile className="h-[220px]" />
                    <SkeletonTile className="lg:col-span-3 h-[180px]" />
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

    const statusHistory = order.statusHistory || []
    const hasHistory = statusHistory.length > 0
    // Timeline renders newest first; history is stored oldest first.
    const timelineItems = [...statusHistory]
        .reverse()
        .map((historyItem, index) => ({
            id: index,
            title: getStatusInfo(historyItem.status).displayName,
            at: historyItem.timestamp,
        }))

    return (
        <AccountShell active="orders" header={header}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
                {/* Progress */}
                <DashCard title="Order progress" className="lg:col-span-2">
                    {order.trackingId && (
                        <div className="mb-4">
                            <DottedRow label="Tracking ID">
                                <span className="font-mono">{order.trackingId}</span>
                                <button
                                    type="button"
                                    onClick={() => copyToClipboard(order.trackingId)}
                                    title="Copy tracking ID"
                                    aria-label="Copy tracking ID"
                                    className="dash-hoverable rounded-full h-6 w-6 grid place-items-center border border-[var(--dash-line)] bg-[var(--dash-card)] cursor-pointer hover:bg-[var(--dash-canvas)] text-[var(--dash-ink-soft)] hover:text-[var(--dash-ink)]"
                                >
                                    <IoCopyOutline size={12} />
                                </button>
                            </DottedRow>
                        </div>
                    )}

                    {hasHistory ? (
                        <Timeline items={timelineItems} />
                    ) : (
                        <div className="flex flex-col items-start gap-2">
                            {order.status && (
                                <StatusPill tone={orderTone(order.status)}>
                                    {getStatusInfo(order.status).displayName}
                                </StatusPill>
                            )}
                            <p className="text-[13px] dash-soft">
                                This is the current status of your order. A step-by-step history will appear
                                here as it progresses.
                            </p>
                        </div>
                    )}
                </DashCard>

                {/* Summary */}
                <DashCard title="Order summary">
                    {order.cartItem && (
                        <div className="flex flex-col gap-4">
                            {product && (
                                <div className="flex gap-3 items-center">
                                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[var(--dash-r-inner)] border border-[var(--dash-line)] bg-[var(--dash-canvas)]">
                                        <Image
                                            src={`/api/proxy?key=${encodeURIComponent(product.images?.[0] || '/placeholder.jpg')}`}
                                            alt={product.name || 'Product'}
                                            width={56}
                                            height={56}
                                            className="object-cover w-full h-full"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[13px] font-medium truncate">{product.name}</p>
                                        <p className="dash-data dash-soft mt-0.5">Qty: {order.cartItem.quantity}</p>
                                        {order.cartItem.selectedVariants &&
                                            Object.keys(order.cartItem.selectedVariants).length > 0 && (
                                                <p className="dash-data dash-soft mt-0.5">
                                                    {Object.entries(order.cartItem.selectedVariants)
                                                        .map(([type, option]) => `${type}: ${option}`)
                                                        .join(', ')}
                                                </p>
                                            )}
                                    </div>
                                </div>
                            )}

                            <div className="pt-2 border-t border-[var(--dash-line)]">
                                <DottedRow label="Subtotal">
                                    {order.cartItem.currency || 'S'}$
                                    {money(
                                        (order.cartItem.finalPrice || order.cartItem.price || 0) *
                                            order.cartItem.quantity,
                                    )}
                                </DottedRow>
                                {order.cartItem.deliveryFee > 0 && (
                                    <DottedRow label={`Shipping (${order.cartItem.chosenDeliveryType})`}>
                                        {order.cartItem.currency || 'S'}${money(order.cartItem.deliveryFee)}
                                    </DottedRow>
                                )}
                                {order.cartItem.priceBeforeDiscount &&
                                    order.cartItem.finalPrice &&
                                    order.cartItem.priceBeforeDiscount !== order.cartItem.finalPrice && (
                                        <DottedRow label="Discount">
                                            <span className="text-[var(--dash-ok)]">
                                                -{order.cartItem.currency || 'S'}$
                                                {money(
                                                    (order.cartItem.priceBeforeDiscount - order.cartItem.finalPrice) *
                                                        order.cartItem.quantity,
                                                )}
                                            </span>
                                        </DottedRow>
                                    )}
                                <div className="mt-1 pt-1 border-t border-[var(--dash-line)]">
                                    <DottedRow label="Total">
                                        <span className="font-medium">
                                            {order.cartItem.currency || 'S'}$
                                            {money(order.cartItem.price * order.cartItem.quantity)}
                                        </span>
                                    </DottedRow>
                                </div>
                            </div>
                        </div>
                    )}
                </DashCard>

                {/* Contact & shipping */}
                <DashCard title="Contact & shipping" className="lg:col-span-3">
                    <div className="flex flex-col gap-6">
                        {(customerDetails?.name || customerDetails?.email || customerDetails?.phone) && (
                            <section>
                                <h4 className="dash-label mb-1">Customer</h4>
                                <div className="max-w-md">
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
                                </div>
                            </section>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {order.contact?.address && (
                                <section>
                                    <h4 className="dash-label mb-1">Shipping address</h4>
                                    <div className="text-[13px] bg-[var(--dash-canvas)] border border-[var(--dash-line)] rounded-[var(--dash-r-inner)] px-3 py-2.5 leading-relaxed">
                                        {order.contact.address.street && <p>{order.contact.address.street}</p>}
                                        {order.contact.address.unitNumber && (
                                            <p className="dash-soft">Unit: {order.contact.address.unitNumber}</p>
                                        )}
                                        <p>
                                            {[
                                                order.contact.address.city,
                                                order.contact.address.state,
                                                order.contact.address.postalCode,
                                            ]
                                                .filter(Boolean)
                                                .join(', ')}
                                        </p>
                                        {order.contact.address.country && (
                                            <p className="font-medium">{order.contact.address.country}</p>
                                        )}
                                        {order.contact.phone && (
                                            <p className="mt-2 pt-2 border-t border-[var(--dash-line)] dash-soft">
                                                Contact: {order.contact.phone.countryCode} {order.contact.phone.number}
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
                        </div>

                        <div className="max-w-md">
                            <DottedRow label="Shipping method">
                                <span className="capitalize">
                                    {order.cartItem.chosenDeliveryType || 'Standard Delivery'}
                                </span>
                            </DottedRow>
                            <DottedRow label="Payment method">
                                {paymentMethod ? (
                                    <>
                                        {paymentMethod.type === 'card' && (
                                            <span className="flex items-center gap-1.5">
                                                <span className="capitalize">{paymentMethod.card?.brand || 'Card'}</span>
                                                <span className="font-mono">•••• {paymentMethod.card?.last4}</span>
                                            </span>
                                        )}
                                        {paymentMethod.type === 'paynow' && <span>PayNow</span>}
                                        {paymentMethod.type === 'grabpay' && <span>GrabPay</span>}
                                        {!paymentMethod.type && <span>Stripe Checkout</span>}
                                    </>
                                ) : (
                                    <span>Stripe Checkout</span>
                                )}
                            </DottedRow>
                        </div>

                        {order.cartItem.orderNote && (
                            <section className="bg-[var(--dash-sun-soft)] rounded-[var(--dash-r-inner)] px-3 py-2.5">
                                <h4 className="dash-label">Your note</h4>
                                <p className="mt-1 text-[13px] whitespace-pre-wrap leading-relaxed">
                                    {order.cartItem.orderNote}
                                </p>
                            </section>
                        )}

                        <div className="flex items-center gap-2 pt-3 border-t border-[var(--dash-line)]">
                            <p className="dash-data dash-soft">
                                Need help? Contact support with your order ID:{' '}
                                <span className="font-mono font-medium text-[var(--dash-ink)]">{shortId}</span>
                            </p>
                            <button
                                type="button"
                                onClick={() => copyToClipboard(shortId)}
                                title="Copy order ID"
                                aria-label="Copy order ID"
                                className="dash-hoverable rounded-full h-6 w-6 grid place-items-center border border-[var(--dash-line)] bg-[var(--dash-card)] cursor-pointer hover:bg-[var(--dash-canvas)] text-[var(--dash-ink-soft)] hover:text-[var(--dash-ink)]"
                            >
                                <IoCopyOutline size={12} />
                            </button>
                        </div>
                    </div>
                </DashCard>
            </div>
        </AccountShell>
    )
}

export default OrderPage
