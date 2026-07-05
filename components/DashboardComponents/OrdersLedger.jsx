'use client'
// Orders ledger + order peek (blueprint §5.2). Replaces the old ActionItems
// grid/list widget and its centered modal with a date-grouped LedgerTable and
// a PeekPanel, preserving every capability from docs/DASHBOARD-FEATURES.md
// §1.1: status updates (per orderType status sets), tracking ID, copy
// email/address/phone, highlighted customer note, print configuration with
// mesh-colour swatches + copy-JSON, and CSV export (now a quiet header action).
import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { IoChevronDownOutline, IoCopyOutline, IoDownloadOutline } from 'react-icons/io5'
import { DashCard, DottedRow, EmptyState, FreshnessStamp, PeekPanel, StatusPill } from '@/components/dashboard-ui'
import { useOrderStatuses, getStatusDisplayName } from '@/utils/useOrderStatuses'
import { useToast } from '../General/ToastProvider'
import { formatMoney } from './format'

// ONE StatusPill mapping for the whole ledger (§5.2).
export function statusTone(statusKey) {
    if (statusKey === 'pending') return 'hatch'
    if (statusKey === 'successful' || statusKey === 'delivered') return 'ok'
    if (statusKey === 'cancelled') return 'bad'
    return 'paper'
}

const addressText = (contact) =>
    contact?.address
        ? [
              contact.address.street,
              contact.address.unitNumber,
              contact.address.city,
              contact.address.state,
              contact.address.postalCode,
              contact.address.country,
          ]
              .filter(Boolean)
              .join(', ')
        : ''

function CopyButton({ text, label, onCopy }) {
    return (
        <button
            type="button"
            onClick={() => onCopy(text)}
            title={label}
            aria-label={label}
            className="dash-hoverable rounded-full h-6 w-6 grid place-items-center border border-[var(--dash-line)] bg-[var(--dash-card)] cursor-pointer hover:bg-[var(--dash-canvas)] text-[var(--dash-ink-soft)] hover:text-[var(--dash-ink)]"
        >
            <IoCopyOutline size={12} />
        </button>
    )
}

// One grid template for the ledger header and every row (kept in sync).
const LEDGER_COLS = 'minmax(0, 2.5fr) minmax(48px, 0.5fr) minmax(88px, 1fr) minmax(96px, 1fr)'

export default function OrdersLedger({ orders, onPatch, prefix, updatedAt }) {
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [trackingId, setTrackingId] = useState('')
    const [updating, setUpdating] = useState(false)
    const [showAll, setShowAll] = useState(false)
    // Collapsed day-groups (client feedback 2026-07-05): every day starts
    // expanded; the white date strip toggles its own rows.
    const [collapsedDays, setCollapsedDays] = useState(() => new Set())
    const { showToast } = useToast()
    const { orderStatuses: regularOrderStatuses } = useOrderStatuses('order')
    const { orderStatuses: printOrderStatuses } = useOrderStatuses('printOrder')
    const allStatuses = useMemo(
        () => [...regularOrderStatuses, ...printOrderStatuses],
        [regularOrderStatuses, printOrderStatuses],
    )

    useEffect(() => {
        if (selectedOrder) setTrackingId(selectedOrder.trackingId || '')
    }, [selectedOrder])

    const sorted = useMemo(
        () => [...orders].sort((a, b) => new Date(b.orderedAt) - new Date(a.orderedAt)),
        [orders],
    )
    const visible = showAll ? sorted : sorted.slice(0, 8)

    const groups = useMemo(() => {
        const byDay = []
        visible.forEach((order) => {
            const key = dayjs(order.orderedAt).format('YYYY-MM-DD')
            let group = byDay.find((g) => g.key === key)
            if (!group) {
                group = { key, label: dayjs(order.orderedAt).format('D MMM YYYY'), orders: [] }
                byDay.push(group)
            }
            group.orders.push(order)
        })
        return byDay
    }, [visible])

    const toggleDay = (key) =>
        setCollapsedDays((prev) => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })

    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text)
            showToast('Copied to clipboard!', 'success')
        } catch (err) {
            showToast('Failed to copy to clipboard', 'error')
        }
    }

    const handleStatusChange = async (newStatus) => {
        if (!selectedOrder) return
        setUpdating(true)
        try {
            const response = await fetch('/api/user/orders', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: selectedOrder.orderId,
                    status: newStatus,
                    trackingId: trackingId || undefined,
                }),
            })
            if (!response.ok) throw new Error('Failed to update order')
            const patch = { orderStatus: newStatus, trackingId: trackingId || selectedOrder.trackingId }
            onPatch(selectedOrder.orderId, patch)
            setSelectedOrder((o) => ({ ...o, ...patch }))
            showToast('Order updated successfully', 'success')
        } catch (e) {
            showToast('Failed to update order: ' + e.message, 'error')
        }
        setUpdating(false)
    }

    const handleTrackingIdUpdate = async () => {
        if (!selectedOrder) return
        setUpdating(true)
        try {
            const response = await fetch('/api/user/orders', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: selectedOrder.orderId,
                    trackingId: trackingId || null,
                }),
            })
            if (!response.ok) throw new Error('Failed to update tracking ID')
            onPatch(selectedOrder.orderId, { trackingId: trackingId || null })
            setSelectedOrder((o) => ({ ...o, trackingId: trackingId || null }))
            showToast('Tracking ID updated successfully', 'success')
        } catch (e) {
            showToast('Failed to update tracking ID: ' + e.message, 'error')
        }
        setUpdating(false)
    }

    const exportToCsv = () => {
        const headers = [
            'Order ID', 'Product', 'Buyer Name', 'Buyer Email', 'Status',
            'Order Type', 'Quantity', 'Price', 'Delivery Type', 'Order Date',
            'Order Note', 'Contact Address', 'Contact Phone',
        ]
        const csvData = sorted.map((order) => [
            order.orderId,
            order.productName,
            order.buyerFirstName,
            order.buyerEmail,
            order.orderStatus,
            order.orderType,
            order.quantity,
            `$${(order.price || 0).toFixed(2)}`,
            order.deliveryType,
            new Date(order.orderedAt).toLocaleDateString(),
            order.orderNote || '',
            addressText(order.contact),
            order.contact?.phone ? `${order.contact.phone.countryCode} ${order.contact.phone.number}` : '',
        ])
        const csvContent = [headers, ...csvData]
            .map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(','))
            .join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `orders_${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        showToast('Orders exported successfully!', 'success')
    }

    const headerAction = (
        <div className="flex items-center gap-3">
            {updatedAt && <FreshnessStamp at={updatedAt} />}
            {sorted.length > 0 && (
                <button
                    type="button"
                    onClick={exportToCsv}
                    className="dash-hoverable flex items-center gap-1.5 rounded-full border border-[var(--dash-line)] px-3 py-1 text-[12px] dash-soft cursor-pointer hover:text-[var(--dash-ink)] hover:bg-[var(--dash-canvas)]"
                >
                    <IoDownloadOutline size={13} />
                    Export CSV
                </button>
            )}
        </div>
    )

    const isPrintOrder = selectedOrder?.orderType === 'printOrder'
    const availableStatuses = isPrintOrder ? printOrderStatuses : regularOrderStatuses

    return (
        <DashCard title={`Orders${sorted.length ? ` (${sorted.length})` : ''}`} action={headerAction}>
            {sorted.length === 0 ? (
                <EmptyState
                    title="No Orders Yet"
                    body="Orders containing your products will appear here as customers buy."
                />
            ) : (
                <>
                    <div className="-mx-5">
                        {/* Column header sits outside the scroll box so it never scrolls away. */}
                        <div className="grid px-5 py-2" style={{ gridTemplateColumns: LEDGER_COLS }}>
                            <span className="dash-label">Order</span>
                            <span className="dash-label text-right">Qty</span>
                            <span className="dash-label text-right">Total</span>
                            <span className="dash-label text-right">Status</span>
                        </div>

                        {/* The ledger body scrolls inside itself instead of endlessly
                            extending the page (client feedback 2026-07-05). */}
                        <div className="max-h-[560px] dash-scroll">
                            {groups.map((group) => {
                                const collapsed = collapsedDays.has(group.key)
                                return (
                                    <section key={group.key}>
                                        {/* Date strip: full-width card-background band, sticky
                                            within the scroll box; click collapses the day. */}
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
                                                {group.orders.map((order) => (
                                                    <button
                                                        key={order.orderId}
                                                        type="button"
                                                        onClick={() => setSelectedOrder(order)}
                                                        className={`dash-hoverable grid w-full items-center px-5 py-2.5 text-left cursor-pointer hover:bg-[var(--dash-canvas)] ${
                                                            selectedOrder?.orderId === order.orderId ? 'bg-[var(--dash-sun-soft)]' : ''
                                                        }`}
                                                        style={{ gridTemplateColumns: LEDGER_COLS }}
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="text-[13px] font-medium truncate">{order.productName}</p>
                                                            <p className="dash-data dash-soft truncate">
                                                                #{order.orderId.slice(-8).toUpperCase()}, {order.buyerFirstName || order.buyerEmail || 'Unknown'}
                                                            </p>
                                                        </div>
                                                        <span className="dash-data text-right">{order.quantity}</span>
                                                        <span className="dash-data text-right">
                                                            {prefix}
                                                            {formatMoney(order.price || 0)}
                                                        </span>
                                                        <span className="text-right">
                                                            <StatusPill tone={statusTone(order.orderStatus)}>
                                                                {getStatusDisplayName(order.orderStatus, allStatuses)}
                                                            </StatusPill>
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </section>
                                )
                            })}
                        </div>
                    </div>
                    {sorted.length > 8 && (
                        <div className="flex justify-end pt-3">
                            <button
                                type="button"
                                onClick={() => setShowAll((v) => !v)}
                                className="text-[13px] dash-soft hover:text-[var(--dash-ink)] cursor-pointer"
                            >
                                {showAll ? 'Show fewer' : `View all (${sorted.length}) →`}
                            </button>
                        </div>
                    )}
                </>
            )}

            <PeekPanel
                open={!!selectedOrder}
                onClose={() => setSelectedOrder(null)}
                title={selectedOrder ? `Order #${selectedOrder.orderId.slice(-8).toUpperCase()}` : ''}
            >
                {selectedOrder && (
                    <div className="flex flex-col gap-6">
                        <section>
                            <div className="flex items-center justify-between">
                                <h4 className="dash-label">Update status</h4>
                                {updating && <span className="dash-data dash-soft">Updating…</span>}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {availableStatuses
                                    .filter((status) => status.isActive !== false)
                                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                                    .map((status) => {
                                        const isSelected = selectedOrder.orderStatus === status.statusKey
                                        return (
                                            <button
                                                key={status.statusKey}
                                                type="button"
                                                disabled={updating || isSelected}
                                                onClick={() => handleStatusChange(status.statusKey)}
                                                className={`dash-hoverable rounded-full px-3 py-1 text-[12px] font-medium ${
                                                    isSelected
                                                        ? 'bg-[var(--dash-ink)] text-[var(--dash-canvas)] cursor-default'
                                                        : 'border border-[var(--dash-line)] bg-[var(--dash-card)] dash-soft cursor-pointer hover:text-[var(--dash-ink)] hover:bg-[var(--dash-canvas)] disabled:cursor-not-allowed'
                                                }`}
                                            >
                                                {status.displayName ||
                                                    status.statusKey.charAt(0).toUpperCase() + status.statusKey.slice(1)}
                                            </button>
                                        )
                                    })}
                            </div>
                        </section>

                        <section>
                            <div className="flex items-center justify-between">
                                <h4 className="dash-label">Tracking ID</h4>
                                {selectedOrder.trackingId && (
                                    <a
                                        href={`/account/orders/${selectedOrder.orderId}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[12px] underline hover:text-[var(--dash-ink)] dash-soft"
                                    >
                                        View customer page
                                    </a>
                                )}
                            </div>
                            <div className="mt-2 flex gap-2">
                                <input
                                    type="text"
                                    value={trackingId}
                                    onChange={(e) => setTrackingId(e.target.value)}
                                    placeholder="e.g. SPX123456789"
                                    disabled={updating}
                                    className="flex-1 min-w-0 rounded-[var(--dash-r-inner)] border border-[var(--dash-line)] bg-[var(--dash-card)] px-3 py-1.5 text-[13px]"
                                />
                                <button
                                    type="button"
                                    onClick={handleTrackingIdUpdate}
                                    disabled={updating || trackingId === (selectedOrder.trackingId || '')}
                                    className="dash-hoverable rounded-full border border-[var(--dash-line)] bg-[var(--dash-card)] px-3.5 py-1.5 text-[12px] font-medium cursor-pointer hover:bg-[var(--dash-canvas)] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {updating ? 'Saving…' : 'Save'}
                                </button>
                            </div>
                            <p className="mt-2 dash-data dash-soft">
                                {selectedOrder.trackingId
                                    ? 'The customer can track this order from their account.'
                                    : 'Add a tracking ID to enable the customer order tracking page.'}
                            </p>
                        </section>

                        {selectedOrder.orderNote && (
                            <section className="bg-[var(--dash-sun-soft)] rounded-[var(--dash-r-inner)] px-3 py-2.5">
                                <h4 className="dash-label">Customer note</h4>
                                <p className="mt-1 text-[13px] whitespace-pre-wrap">{selectedOrder.orderNote}</p>
                            </section>
                        )}

                        <section>
                            <h4 className="dash-label mb-1">Order</h4>
                            <DottedRow label="Product">{selectedOrder.productName}</DottedRow>
                            <DottedRow label="Quantity">{selectedOrder.quantity}</DottedRow>
                            <DottedRow label="Total">
                                {prefix}
                                {formatMoney(selectedOrder.price || 0)}
                            </DottedRow>
                            <DottedRow label="Delivery">
                                <span className="capitalize">{selectedOrder.deliveryType || 'Not specified'}</span>
                            </DottedRow>
                            <DottedRow label="Ordered">
                                {dayjs(selectedOrder.orderedAt).format('D MMM YYYY, HH:mm')}
                            </DottedRow>
                        </section>

                        <section>
                            <h4 className="dash-label mb-1">Customer</h4>
                            <DottedRow label="Name">{selectedOrder.buyerFirstName || 'N/A'}</DottedRow>
                            <DottedRow label="Email">
                                <span className="truncate max-w-[200px]">{selectedOrder.buyerEmail || 'Not provided'}</span>
                                {selectedOrder.buyerEmail && (
                                    <CopyButton text={selectedOrder.buyerEmail} label="Copy email" onCopy={copyToClipboard} />
                                )}
                            </DottedRow>
                            {selectedOrder.contact?.phone && (
                                <DottedRow label="Phone">
                                    {selectedOrder.contact.phone.countryCode} {selectedOrder.contact.phone.number}
                                    <CopyButton
                                        text={`${selectedOrder.contact.phone.countryCode} ${selectedOrder.contact.phone.number}`}
                                        label="Copy phone"
                                        onCopy={copyToClipboard}
                                    />
                                </DottedRow>
                            )}
                            {selectedOrder.contact?.address && (
                                <div className="mt-2">
                                    <div className="flex items-center justify-between">
                                        <span className="dash-data dash-soft">Shipping address</span>
                                        <CopyButton
                                            text={addressText(selectedOrder.contact)}
                                            label="Copy address"
                                            onCopy={copyToClipboard}
                                        />
                                    </div>
                                    <p className="mt-1 text-[13px] bg-[var(--dash-canvas)] border border-[var(--dash-line)] rounded-[var(--dash-r-inner)] px-3 py-2">
                                        {addressText(selectedOrder.contact)}
                                    </p>
                                </div>
                            )}
                        </section>

                        {isPrintOrder && selectedOrder.printConfiguration && (
                            <section>
                                <div className="flex items-center justify-between mb-1">
                                    <h4 className="dash-label">Print configuration</h4>
                                    <button
                                        type="button"
                                        onClick={() => copyToClipboard(JSON.stringify(selectedOrder.printConfiguration, null, 2))}
                                        className="dash-hoverable flex items-center gap-1.5 rounded-full border border-[var(--dash-line)] px-2.5 py-1 text-[12px] dash-soft cursor-pointer hover:text-[var(--dash-ink)] hover:bg-[var(--dash-canvas)]"
                                    >
                                        <IoCopyOutline size={12} />
                                        Copy JSON
                                    </button>
                                </div>
                                {selectedOrder.printConfiguration.meshColors &&
                                    Object.entries(selectedOrder.printConfiguration.meshColors).map(([mesh, color]) => (
                                        <DottedRow key={mesh} label={mesh}>
                                            <span
                                                aria-hidden="true"
                                                className="inline-block h-4 w-4 rounded-full border border-[var(--dash-line)]"
                                                style={{ backgroundColor: color }}
                                            />
                                            <span className="font-mono">{color}</span>
                                        </DottedRow>
                                    ))}
                                {selectedOrder.printConfiguration.printSettings &&
                                    Object.entries(selectedOrder.printConfiguration.printSettings).map(([key, value]) => (
                                        <DottedRow
                                            key={key}
                                            label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                                        >
                                            {String(value)}
                                        </DottedRow>
                                    ))}
                                {selectedOrder.printConfiguration.configuredAt && (
                                    <DottedRow label="Configured">
                                        {dayjs(selectedOrder.printConfiguration.configuredAt).format('D MMM YYYY, HH:mm')}
                                    </DottedRow>
                                )}
                            </section>
                        )}
                    </div>
                )}
            </PeekPanel>
        </DashCard>
    )
}
