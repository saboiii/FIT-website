'use client'
import { useState, useEffect } from 'react'
import { useToast } from '@/components/General/ToastProvider'
import { MdAdd } from 'react-icons/md'
import { TbTruckDelivery, TbPackage, TbBox, TbChecks, TbClock } from 'react-icons/tb'
import { FiPackage, FiTruck } from 'react-icons/fi'
import { BiPackage } from 'react-icons/bi'
import { IoMdCheckmarkCircleOutline, IoMdPrint } from 'react-icons/io'
import {
    DashCard,
    StatusPill,
    Sheet,
    ConfirmDialog,
    EmptyState,
    SkeletonRow,
} from '@/components/dashboard-ui'
import { inputCls, labelCls, DashSelect, quietBtnCls } from '@/components/DashboardComponents/ProductFormFields/dashFormUi'
import { sunBtnCls, inkBtnCls } from './dashPanelUi'

// Available icons for order statuses
const AVAILABLE_ICONS = [
    { name: 'TbTruckDelivery', component: TbTruckDelivery, label: 'Truck Delivery' },
    { name: 'TbPackage', component: TbPackage, label: 'Package' },
    { name: 'TbBox', component: TbBox, label: 'Box' },
    { name: 'TbChecks', component: TbChecks, label: 'Checks' },
    { name: 'FiPackage', component: FiPackage, label: 'Package Outline' },
    { name: 'FiTruck', component: FiTruck, label: 'Truck Outline' },
    { name: 'IoMdCheckmarkCircleOutline', component: IoMdCheckmarkCircleOutline, label: 'Check Circle' },
    { name: 'IoMdPrint', component: IoMdPrint, label: 'Print' },
    { name: 'TbClock', component: TbClock, label: 'Clock' },
    { name: 'BiPackage', component: BiPackage, label: 'Package Alt' },
]

const getIconComponent = (iconName) => {
    const icon = AVAILABLE_ICONS.find(i => i.name === iconName)
    return icon ? icon.component : TbTruckDelivery
}

const EMPTY_FORM = {
    statusKey: '',
    displayName: '',
    description: '',
    orderType: 'order',
    color: '#6b7280',
    icon: 'TbTruckDelivery',
    order: 0,
    isActive: true,
}

/**
 * Orders & Statuses (§5.9): statuses are a WORKFLOW, so each order type
 * renders as an ordered pipeline — numbered steps on a vertical hairline, in
 * display order, each step one scannable line (colour swatch, name,
 * description, mono key). Labels are StatusPills; controls are unmistakable
 * buttons. Add/edit in a Sheet (Appendix A relocation); delete via
 * ConfirmDialog. API payloads are unchanged.
 */
export default function OrderStatusManagement() {
    const [orderStatuses, setOrderStatuses] = useState([])
    const [fetching, setFetching] = useState(true)
    const [loading, setLoading] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState(null) // status pending confirm
    const [deleteBusy, setDeleteBusy] = useState(false)
    const { showToast } = useToast()

    const [form, setForm] = useState(EMPTY_FORM)
    const [editingItem, setEditingItem] = useState(null)

    useEffect(() => {
        fetchOrderStatuses()
    }, [])

    const fetchOrderStatuses = async () => {
        try {
            const response = await fetch('/api/admin/order-statuses')
            const data = await response.json()
            if (response.ok) {
                setOrderStatuses(data.orderStatuses || [])
            } else {
                showToast(data.error || 'Failed to fetch order statuses', 'error')
            }
        } catch (error) {
            showToast('Error fetching order statuses: ' + error.message, 'error')
        } finally {
            setFetching(false)
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            const method = editingItem ? 'PUT' : 'POST'
            const payload = editingItem
                ? { type: 'order-status', id: editingItem._id, data: form }
                : { type: 'order-status', data: form }

            const response = await fetch('/api/admin/settings', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const data = await response.json()
            if (response.ok) {
                showToast(
                    editingItem ? 'Order status updated successfully' : 'Order status created successfully',
                    'success'
                )
                resetForm()
                setShowForm(false)
                fetchOrderStatuses()
            } else {
                showToast(data.error || 'Operation failed', 'error')
            }
        } catch (error) {
            showToast('Error: ' + error.message, 'error')
        } finally {
            setLoading(false)
        }
    }

    const confirmDelete = async () => {
        const id = deleteTarget?._id
        setDeleteBusy(true)
        try {
            const response = await fetch('/api/admin/settings', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'order-status', id })
            })
            const data = await response.json()
            if (response.ok) {
                showToast('Order status deleted successfully', 'success')
                setDeleteTarget(null)
                fetchOrderStatuses()
            } else {
                showToast(data.error || 'Failed to delete order status', 'error')
            }
        } catch (error) {
            showToast('Error deleting order status: ' + error.message, 'error')
        } finally {
            setDeleteBusy(false)
        }
    }

    const startEdit = (item) => {
        setForm({
            statusKey: item.statusKey,
            displayName: item.displayName,
            description: item.description,
            orderType: item.orderType,
            color: item.color,
            icon: item.icon || 'TbTruckDelivery',
            order: item.order,
            isActive: item.isActive
        })
        setEditingItem(item)
        setShowForm(true)
    }

    const cancelEdit = () => {
        resetForm()
        setShowForm(false)
    }

    const resetForm = () => {
        setForm(EMPTY_FORM)
        setEditingItem(null)
    }

    // Group statuses by order type and sort by display order (gaps and duplicates allowed)
    const sortByDisplayOrder = (list) =>
        [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

    const groupedStatuses = {
        order: sortByDisplayOrder(orderStatuses.filter(s => s.orderType === 'order')),
        printOrder: sortByDisplayOrder(orderStatuses.filter(s => s.orderType === 'printOrder'))
    }

    // One pipeline step: numbered node on the connector, colour swatch, then
    // name + description in one scannable line with the mono key beneath.
    const statusStep = (status, index) => {
        const Icon = getIconComponent(status.icon)
        const isBuiltIn = status.isHardcoded
        return (
            <li key={status._id || status.statusKey} className="relative flex items-center gap-3 py-2.5">
                <span
                    aria-hidden="true"
                    className="relative z-10 h-6 w-6 shrink-0 grid place-items-center rounded-full border border-[var(--dash-line)] bg-[var(--dash-card)] dash-data"
                >
                    {index + 1}
                </span>
                <span
                    aria-hidden="true"
                    className="h-8 w-8 shrink-0 rounded-full grid place-items-center"
                    style={{ backgroundColor: `${status.color}20` }}
                >
                    <Icon size={15} style={{ color: status.color }} />
                </span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 min-w-0">
                        <p className="text-[13px] font-medium truncate shrink-0 max-w-full">{status.displayName}</p>
                        {status.description && (
                            <p className="hidden sm:block text-[13px] dash-soft truncate">{status.description}</p>
                        )}
                    </div>
                    <p className="font-mono text-[12px] font-medium dash-soft truncate">
                        {status.statusKey} #{typeof status.order === 'number' ? status.order : 0}
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {isBuiltIn && <StatusPill tone="hatch">Built-in</StatusPill>}
                    {status.isActive ? (
                        <StatusPill tone="paper">Active</StatusPill>
                    ) : (
                        <StatusPill tone="bad">Inactive</StatusPill>
                    )}
                    {!isBuiltIn && (
                        <>
                            <button
                                type="button"
                                onClick={() => startEdit(status)}
                                className={`${quietBtnCls} px-3 py-1`}
                            >
                                Edit
                            </button>
                            <button
                                type="button"
                                onClick={() => setDeleteTarget(status)}
                                className="text-[13px] font-medium text-[var(--dash-bad)] cursor-pointer hover:underline px-1.5"
                            >
                                Delete
                            </button>
                        </>
                    )}
                </div>
            </li>
        )
    }

    // A workflow column: ordered steps joined by a vertical hairline, top to
    // bottom in display order — not a generic card list.
    const statusPipeline = (title, list, emptyBody) => (
        <DashCard title={title}>
            {list.length === 0 ? (
                <EmptyState title="No Custom Statuses" body={emptyBody} className="py-6" />
            ) : (
                <>
                    <p className="text-[13px] dash-soft mb-1">
                        Orders move through these steps, top to bottom.
                    </p>
                    <ol className="relative before:absolute before:left-3 before:top-4 before:bottom-4 before:w-px before:bg-[var(--dash-line)]">
                        {list.map(statusStep)}
                    </ol>
                </>
            )}
        </DashCard>
    )

    return (
        <div className="p-4 md:p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <p className="text-[13px] dash-soft max-w-md">
                    The workflow creators move regular and print orders through, shown
                    in display order. Built-in statuses are protected.
                </p>
                <button
                    type="button"
                    onClick={() => { resetForm(); setShowForm(true) }}
                    className={`${sunBtnCls} flex items-center gap-1.5`}
                >
                    <MdAdd size={16} aria-hidden="true" /> Add status
                </button>
            </div>

            {fetching ? (
                <div className="flex flex-col gap-3" aria-label="Loading statuses">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <SkeletonRow key={i} />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                    {statusPipeline('Regular orders', groupedStatuses.order, 'Statuses you add for regular orders appear here.')}
                    {statusPipeline('Print orders', groupedStatuses.printOrder, 'Statuses you add for print orders appear here.')}
                </div>
            )}

            {/* Add/edit form in a Sheet (Appendix A) */}
            <Sheet
                open={showForm}
                onClose={cancelEdit}
                label={editingItem ? 'Edit order status' : 'New order status'}
                widthClass="max-w-xl"
            >
                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                    <h3 className="dash-section">
                        {editingItem ? 'Edit order status' : 'New order status'}
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="statusKey" className={labelCls}>Status key *</label>
                            <input
                                id="statusKey"
                                type="text"
                                value={form.statusKey}
                                onChange={(e) => setForm(prev => ({ ...prev, statusKey: e.target.value }))}
                                className={`${inputCls()} disabled:opacity-50`}
                                placeholder="e.g., awaiting_shipment"
                                required
                                disabled={Boolean(editingItem)}
                            />
                            <p className="text-[11px] font-medium dash-soft">Unique identifier (snake_case, cannot be changed)</p>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="displayName" className={labelCls}>Display name *</label>
                            <input
                                id="displayName"
                                type="text"
                                value={form.displayName}
                                onChange={(e) => setForm(prev => ({ ...prev, displayName: e.target.value }))}
                                className={inputCls()}
                                placeholder="e.g., Awaiting Shipment"
                                required
                            />
                            <p className="text-[11px] font-medium dash-soft">User-friendly name</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="statusDescription" className={labelCls}>Description</label>
                        <textarea
                            id="statusDescription"
                            value={form.description}
                            onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                            className={inputCls()}
                            rows="2"
                            placeholder="Brief description of this status…"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <DashSelect
                            label="Order type"
                            name="orderType"
                            value={form.orderType}
                            onChangeFunction={(e) => setForm(prev => ({ ...prev, orderType: e.target.value }))}
                            options={[
                                { value: 'order', label: 'Regular Order' },
                                { value: 'printOrder', label: 'Print Order' },
                            ]}
                        />
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="statusOrder" className={labelCls}>Display order</label>
                            <input
                                id="statusOrder"
                                type="number"
                                value={form.order}
                                onChange={(e) => {
                                    const raw = e.target.value
                                    const parsed = raw === '' ? '' : parseInt(raw, 10)
                                    setForm(prev => ({ ...prev, order: isNaN(parsed) ? '' : parsed }))
                                }}
                                className={`${inputCls()} dash-data`}
                                min="0"
                                placeholder="0"
                            />
                            <p className="text-[11px] font-medium dash-soft">Lower numbers appear first. Same numbers have equal priority.</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="statusColorHex" className={labelCls}>Colour</label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                aria-label="Colour picker"
                                value={form.color}
                                onChange={(e) => setForm(prev => ({ ...prev, color: e.target.value }))}
                                className="w-12 h-9 shrink-0 border border-[var(--dash-line)] rounded-[var(--dash-r-inner)] cursor-pointer bg-[var(--dash-card)]"
                            />
                            <input
                                id="statusColorHex"
                                type="text"
                                value={form.color}
                                onChange={(e) => setForm(prev => ({ ...prev, color: e.target.value }))}
                                className={`${inputCls()} dash-data flex-1`}
                                placeholder="#6b7280"
                            />
                        </div>
                    </div>

                    {/* Icon picker — pill grid with a selection ring (§5.9) */}
                    <div className="flex flex-col gap-1.5">
                        <span className={labelCls}>Icon</span>
                        <div className="flex flex-wrap gap-2">
                            {AVAILABLE_ICONS.map(icon => {
                                const Icon = icon.component
                                const isSelected = form.icon === icon.name
                                return (
                                    <button
                                        key={icon.name}
                                        type="button"
                                        aria-pressed={isSelected}
                                        onClick={() => setForm(prev => ({ ...prev, icon: icon.name }))}
                                        className={`dash-hoverable h-10 w-10 grid place-items-center rounded-full border cursor-pointer ${
                                            isSelected
                                                ? 'border-[var(--dash-ink)] ring-1 ring-[var(--dash-ink)] bg-[var(--dash-sun-soft)] text-[var(--dash-ink)]'
                                                : 'border-[var(--dash-line)] bg-[var(--dash-card)] text-[var(--dash-ink-soft)] hover:bg-[var(--dash-canvas)]'
                                        }`}
                                        title={icon.label}
                                    >
                                        <Icon size={18} aria-hidden="true" />
                                    </button>
                                )
                            })}
                        </div>
                        <p className="text-[11px] font-medium dash-soft">
                            Selected: {AVAILABLE_ICONS.find(i => i.name === form.icon)?.label}
                        </p>
                    </div>

                    <label htmlFor="isActive" className="flex items-center gap-2 text-[13px] cursor-pointer">
                        <input
                            type="checkbox"
                            id="isActive"
                            checked={form.isActive}
                            onChange={(e) => setForm(prev => ({ ...prev, isActive: e.target.checked }))}
                            className="w-4 h-4 rounded border-[var(--dash-line)] accent-[var(--dash-ink)]"
                        />
                        Active (visible to creators)
                    </label>

                    <div className="flex justify-end gap-2 pt-3 border-t border-[var(--dash-line)]">
                        <button type="button" onClick={cancelEdit} className={quietBtnCls}>
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className={inkBtnCls}>
                            {loading ? 'Saving…' : (editingItem ? 'Update status' : 'Create status')}
                        </button>
                    </div>
                </form>
            </Sheet>

            <ConfirmDialog
                open={Boolean(deleteTarget)}
                onClose={() => setDeleteTarget(null)}
                onConfirm={confirmDelete}
                title="Delete this status?"
                body={deleteTarget ? `"${deleteTarget.displayName}" will no longer be available to creators. This action cannot be undone.` : ''}
                confirmLabel="Delete status"
                tone="bad"
                busy={deleteBusy}
            />
        </div>
    )
}
