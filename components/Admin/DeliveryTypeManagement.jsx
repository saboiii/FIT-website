'use client'
import { useState, useEffect } from 'react'
import { useToast } from '@/components/General/ToastProvider'
import { IoAddOutline, IoTrashOutline, IoChevronDownOutline, IoChevronForwardOutline, IoCarOutline } from 'react-icons/io5'
import { DashCard, Sheet, ConfirmDialog, StatusPill, GlassBar, EmptyState, DottedRow, SkeletonRow, CoachMarks, useTourOffer, TourOfferStrip, TourHelpButton, TOURS } from '@/components/dashboard-ui'
import { inputCls, quietBtnCls } from '@/components/DashboardComponents/ProductFormFields/dashFormUi'

const sunBtnCls =
    'dash-hoverable rounded-full px-4 py-2 text-[13px] font-medium bg-[var(--dash-sun)] text-[var(--dash-ink)] cursor-pointer hover:bg-[var(--dash-sun-deep)] active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed'

const BLANK_FORM = {
    name: '',
    displayName: '',
    description: '',
    applicableToProductTypes: [],
    basePricing: {
        basePrice: '',
        volumeFactor: '',
        weightFactor: '',
        minPrice: '',
        maxPrice: '',
        freeShippingThreshold: ''
    },
    isActive: true
}

const TYPE_LABELS = { shop: 'Shop', print: 'Print' }

// A delivery type with all formula fields zero is effectively free shipping.
const isFreeFormula = (bp) =>
    Number(bp.basePrice) === 0 && Number(bp.volumeFactor || 0) === 0 && Number(bp.weightFactor || 0) === 0

const pricingLabel = (dt) => {
    if (!dt.basePricing || dt.basePricing.basePrice == null) return 'Creator-defined'
    return isFreeFormula(dt.basePricing) ? 'Free' : 'Formula'
}

const hasFormulaDetails = (dt) =>
    dt.basePricing && dt.basePricing.basePrice != null && !isFreeFormula(dt.basePricing)

// The three preset examples + the try-your-own row share one clamp.
const clampPrice = (bp, volume, weight) => {
    const raw = parseFloat(bp.basePrice) + (volume * parseFloat(bp.volumeFactor)) + (weight * parseFloat(bp.weightFactor))
    const minPrice = parseFloat(bp.minPrice) || 0
    const maxPrice = isNaN(parseFloat(bp.maxPrice)) ? Infinity : parseFloat(bp.maxPrice)
    return Math.max(minPrice, Math.min(maxPrice, raw))
}

const PREVIEW_PRESETS = [
    { volume: 1000, weight: 100, label: 'Small Item' },
    { volume: 5000, weight: 500, label: 'Medium Item' },
    { volume: 10000, weight: 1000, label: 'Large Item' }
]

export default function DeliveryTypeManagement() {
    const [deliveryTypes, setDeliveryTypes] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [expandedDeliveryTypes, setExpandedDeliveryTypes] = useState({})
    const [showDeliveryTypeForm, setShowDeliveryTypeForm] = useState(false)
    const [editingDeliveryType, setEditingDeliveryType] = useState(null)
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [deleteBusy, setDeleteBusy] = useState(false)
    const [tourOpen, setTourOpen] = useState(false)
    const tourOffer = useTourOffer('delivery')
    const { showToast } = useToast()

    const [formData, setFormData] = useState(BLANK_FORM)
    const [customExample, setCustomExample] = useState({ volume: '', weight: '' })

    const toggleDeliveryType = (deliveryTypeName) => {
        setExpandedDeliveryTypes(prev => ({
            ...prev,
            [deliveryTypeName]: !prev[deliveryTypeName]
        }))
    }

    useEffect(() => {
        fetchDeliveryTypes()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const fetchDeliveryTypes = async () => {
        try {
            const response = await fetch('/api/admin/settings')
            const data = await response.json()
            if (response.ok) {
                setDeliveryTypes(data.deliveryTypes || [])
            } else {
                showToast('Failed to fetch delivery types', 'error')
            }
        } catch (error) {
            showToast('Error: ' + error.message, 'error')
        } finally {
            setLoading(false)
        }
    }

    const openCreate = () => {
        setEditingDeliveryType(null)
        setFormData(BLANK_FORM)
        setShowDeliveryTypeForm(true)
    }

    const openEdit = (dt) => {
        setEditingDeliveryType(dt)
        setFormData({
            name: dt.name,
            displayName: dt.displayName,
            description: dt.description || '',
            applicableToProductTypes: dt.applicableToProductTypes || [],
            basePricing: {
                basePrice: dt.basePricing?.basePrice ?? '',
                volumeFactor: dt.basePricing?.volumeFactor ?? '',
                weightFactor: dt.basePricing?.weightFactor ?? '',
                minPrice: dt.basePricing?.minPrice ?? '',
                maxPrice: dt.basePricing?.maxPrice ?? '',
                freeShippingThreshold: dt.basePricing?.freeShippingThreshold ?? '',
            },
            isActive: dt.isActive,
        })
        setShowDeliveryTypeForm(true)
    }

    const closeForm = () => {
        setShowDeliveryTypeForm(false)
        setEditingDeliveryType(null)
        setFormData(BLANK_FORM)
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.name || !formData.displayName || formData.applicableToProductTypes.length === 0) {
            showToast('Please fill in all required fields', 'error')
            return
        }

        // Validate formula-based pricing fields if any are filled
        const bp = formData.basePricing || {}
        const hasFormula = bp.basePrice !== '' || bp.volumeFactor !== '' || bp.weightFactor !== '' || bp.minPrice !== '' || bp.maxPrice !== ''
        if (hasFormula) {
            const basePrice = parseFloat(bp.basePrice)
            const volumeFactor = parseFloat(bp.volumeFactor)
            const weightFactor = parseFloat(bp.weightFactor)
            const minPrice = parseFloat(bp.minPrice)
            const maxPrice = parseFloat(bp.maxPrice)

            if ([basePrice, volumeFactor, weightFactor].some(v => isNaN(v) || v < 0)) {
                showToast('Base price, volume factor, and weight factor must be non-negative numbers', 'error')
                return
            }
            if (!isNaN(minPrice) && !isNaN(maxPrice) && minPrice > maxPrice) {
                showToast('Minimum price cannot exceed maximum price', 'error')
                return
            }
        }

        setSaving(true)
        try {
            let response;
            if (editingDeliveryType) {
                // Edit mode - PUT to update existing delivery type
                response = await fetch('/api/admin/settings', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'delivery-type',
                        id: editingDeliveryType._id,
                        data: {
                            displayName: formData.displayName,
                            description: formData.description,
                            applicableToProductTypes: formData.applicableToProductTypes,
                            basePricing: formData.basePricing,
                            isActive: formData.isActive,
                        }
                    })
                })
            } else {
                // Add mode - POST to create new delivery type
                response = await fetch('/api/admin/settings', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'deliveryType',
                        action: 'add',
                        data: formData
                    })
                })
            }

            const result = await response.json()
            if (response.ok) {
                showToast(editingDeliveryType ? 'Delivery type updated!' : 'Delivery type added!', 'success')

                // Notify affected creators if editing
                if (editingDeliveryType) {
                    try {
                        await fetch('/api/admin/notify-delivery-change', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                deliveryTypeName: editingDeliveryType.name,
                                changes: formData,
                            })
                        })
                    } catch (e) {
                        console.error('Failed to notify creators:', e)
                    }
                }

                closeForm()
                fetchDeliveryTypes()
            } else {
                showToast(result.error || 'Failed to add', 'error')
            }
        } catch (error) {
            showToast('Error: ' + error.message, 'error')
        } finally {
            setSaving(false)
        }
    }

    // Delete goes through ConfirmDialog (window.confirm is banned — §4.10).
    const confirmDelete = async () => {
        const name = deleteTarget?.name
        setDeleteBusy(true)
        try {
            const deliveryType = deliveryTypes.find(dt => dt.name === name && !dt.isHardcoded)
            if (!deliveryType || !deliveryType._id) {
                showToast('Unable to delete: missing id for this delivery type', 'error')
                return
            }

            const response = await fetch('/api/admin/settings', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'delivery-type', id: deliveryType._id })
            })

            if (response.ok) {
                showToast('Deleted!', 'success')
                fetchDeliveryTypes()
            } else {
                showToast('Failed to delete', 'error')
            }
        } catch (error) {
            showToast('Error: ' + error.message, 'error')
        } finally {
            setDeleteBusy(false)
            setDeleteTarget(null)
        }
    }

    const handleToggleActive = async (name, isActive) => {
        try {
            const response = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'delivery-type',
                    action: 'toggleActive',
                    name,
                    isActive: !isActive
                })
            })

            if (response.ok) {
                showToast('Updated!', 'success')
                fetchDeliveryTypes()
            } else {
                showToast('Failed to update', 'error')
            }
        } catch (error) {
            showToast('Error: ' + error.message, 'error')
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col gap-3 p-4 md:p-6" aria-label="Loading delivery types">
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
            </div>
        )
    }

    const bpForm = formData.basePricing
    const previewReady = bpForm.basePrice && bpForm.volumeFactor && bpForm.weightFactor

    const numberField = (label, key, { placeholder, step, help }) => (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={`bp-${key}`} className="text-[13px] font-medium text-[var(--dash-ink)]">{label}</label>
            <input
                id={`bp-${key}`}
                type="number"
                value={formData.basePricing[key]}
                onChange={(e) => setFormData(prev => ({
                    ...prev,
                    basePricing: { ...prev.basePricing, [key]: e.target.value }
                }))}
                className={`${inputCls()} text-right dash-data`}
                placeholder={placeholder}
                min="0"
                step={step}
            />
            <span className="text-[13px] dash-soft">{help}</span>
        </div>
    )

    return (
        <div className="flex flex-col gap-4 p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="dash-title">Delivery</h2>
                    <p className="text-[13px] dash-soft mt-1">
                        Configure delivery options with custom pricing tiers for creators.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {deliveryTypes.length > 0 && (
                        <button onClick={openCreate} data-tour="delivery-new" className={`${sunBtnCls} flex items-center gap-1.5`}>
                            <IoAddOutline size={16} aria-hidden="true" />
                            New Delivery Type
                        </button>
                    )}
                    <TourHelpButton onClick={() => setTourOpen(true)} />
                </div>
            </div>

            {tourOffer.offered && !tourOpen && (
                <TourOfferStrip
                    onStart={() => { tourOffer.accept(); setTourOpen(true) }}
                    onDismiss={tourOffer.dismiss}
                />
            )}

            {/* Delivery types — list-first (§5.14) */}
            <DashCard
                data-tour="delivery-list"
                title="All delivery types"
                action={<span className="text-[13px] dash-soft dash-data">{deliveryTypes.length} total · Digital delivery is always available</span>}
            >
                {deliveryTypes.length === 0 ? (
                    <EmptyState
                        icon={<IoCarOutline />}
                        title="No Delivery Types Yet"
                        body="Create delivery options for creators to use on their products."
                        cta="Add Delivery Type"
                        onCta={openCreate}
                    />
                ) : (
                    <div className="flex flex-col gap-2">
                        {deliveryTypes.map((dt, idx) => (
                            <div key={dt.name || idx} className="border border-[var(--dash-line)] rounded-[var(--dash-r-inner)]">
                                <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
                                    <div className="flex items-start gap-2 flex-1 min-w-0">
                                        {hasFormulaDetails(dt) && (
                                            <button
                                                onClick={() => toggleDeliveryType(dt.name)}
                                                className="dash-hoverable p-1 mt-0.5 rounded-full text-[var(--dash-ink-soft)] hover:text-[var(--dash-ink)] hover:bg-[var(--dash-sun-soft)] cursor-pointer shrink-0"
                                                aria-expanded={!!expandedDeliveryTypes[dt.name]}
                                                aria-label={expandedDeliveryTypes[dt.name] ? 'Collapse pricing formula' : 'Expand pricing formula'}
                                            >
                                                {expandedDeliveryTypes[dt.name] ? (
                                                    <IoChevronDownOutline size={14} aria-hidden="true" />
                                                ) : (
                                                    <IoChevronForwardOutline size={14} aria-hidden="true" />
                                                )}
                                            </button>
                                        )}

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-[13px] font-medium text-[var(--dash-ink)]">{dt.displayName}</span>
                                                <span className="dash-data rounded-full border border-[var(--dash-line)] bg-[var(--dash-canvas)] px-2 py-0.5 text-[var(--dash-ink-soft)]">
                                                    {dt.name}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                                                {dt.applicableToProductTypes?.map(type => (
                                                    <StatusPill key={type} tone="paper">{TYPE_LABELS[type] || type}</StatusPill>
                                                ))}
                                                {dt.isHardcoded && <StatusPill tone="hatch">Built-in</StatusPill>}
                                                <span className="text-[13px] dash-soft">{pricingLabel(dt)}</span>
                                            </div>
                                            {dt.description && (
                                                <p className="text-[13px] dash-soft mt-2">{dt.description}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            role="switch"
                                            data-tour="delivery-toggle"
                                            aria-checked={dt.isActive}
                                            aria-label={`${dt.displayName} active`}
                                            onClick={() => handleToggleActive(dt.name, dt.isActive)}
                                            className={`dash-hoverable relative h-5 w-9 rounded-full cursor-pointer ${
                                                dt.isActive ? 'bg-[var(--dash-ink)]' : 'bg-[var(--dash-line)]'
                                            }`}
                                        >
                                            <span
                                                className={`absolute top-0.5 h-4 w-4 rounded-full bg-[var(--dash-card)] transition-transform ${
                                                    dt.isActive ? 'translate-x-[18px]' : 'translate-x-0.5'
                                                }`}
                                            />
                                        </button>
                                        <span className="text-[13px] dash-soft w-14">{dt.isActive ? 'Active' : 'Inactive'}</span>
                                        {!dt.isHardcoded && (
                                            <>
                                                <button onClick={() => openEdit(dt)} className={quietBtnCls}>
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTarget(dt)}
                                                    className="dash-hoverable p-2 rounded-full text-[var(--dash-ink-soft)] hover:text-[var(--dash-bad)] hover:bg-[var(--dash-bad-bg)] cursor-pointer shrink-0"
                                                    aria-label="Delete delivery type"
                                                >
                                                    <IoTrashOutline size={14} aria-hidden="true" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Pricing formula details — collapsible spec sheet */}
                                {hasFormulaDetails(dt) && expandedDeliveryTypes[dt.name] && (
                                    <div className="border-t border-[var(--dash-line)] px-4 py-3">
                                        <p className="dash-label mb-2">Pricing Formula</p>
                                        <div className="max-w-md flex flex-col">
                                            <DottedRow label="Base price">${dt.basePricing.basePrice}</DottedRow>
                                            <DottedRow label="Volume factor">${dt.basePricing.volumeFactor}/cm³</DottedRow>
                                            <DottedRow label="Weight factor">${dt.basePricing.weightFactor}/g</DottedRow>
                                            <DottedRow label="Min price">${dt.basePricing.minPrice}</DottedRow>
                                            <DottedRow label="Max price">${dt.basePricing.maxPrice}</DottedRow>
                                            {dt.basePricing.freeShippingThreshold && (
                                                <DottedRow label="Free shipping over">${dt.basePricing.freeShippingThreshold}</DottedRow>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </DashCard>

            {/* Create / edit — a Sheet with a GlassBar header (§5.14) */}
            <Sheet
                open={showDeliveryTypeForm}
                onClose={closeForm}
                label={editingDeliveryType ? 'Edit delivery type' : 'New delivery type'}
                widthClass="max-w-4xl"
            >
                <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
                    <GlassBar className="flex-wrap">
                        <h3 className="dash-section">{editingDeliveryType ? 'Edit Delivery Type' : 'New Delivery Type'}</h3>
                        <div className="ml-auto flex items-center gap-2">
                            <button type="button" onClick={closeForm} className={quietBtnCls} disabled={saving}>
                                Cancel
                            </button>
                            <button type="submit" disabled={saving} className={sunBtnCls}>
                                {saving
                                    ? (editingDeliveryType ? 'Saving…' : 'Adding…')
                                    : (editingDeliveryType ? 'Save Changes' : 'Add Delivery Type')}
                            </button>
                        </div>
                    </GlassBar>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="dt-name" className="text-[13px] font-medium text-[var(--dash-ink)]">URL Name*</label>
                            <input
                                id="dt-name"
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                                className={inputCls()}
                                placeholder="premium-delivery"
                                required
                            />
                            <span className="text-[13px] dash-soft">Lowercase, no spaces</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="dt-displayName" className="text-[13px] font-medium text-[var(--dash-ink)]">Display Name*</label>
                            <input
                                id="dt-displayName"
                                type="text"
                                value={formData.displayName}
                                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                                className={inputCls()}
                                placeholder="Premium Delivery"
                                required
                            />
                            <span className="text-[13px] dash-soft">Shown to users</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="dt-description" className="text-[13px] font-medium text-[var(--dash-ink)]">Description</label>
                        <textarea
                            id="dt-description"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className={`${inputCls()} resize-none`}
                            placeholder="Optional instructions for creators (e.g., pickup location, estimated delivery time)"
                            rows={2}
                        />
                        <span className="text-[13px] dash-soft">Creators can customize this per product</span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <span className="text-[13px] font-medium text-[var(--dash-ink)]">Applicable To*</span>
                        <div className="flex gap-4">
                            {['shop', 'print'].map((type) => (
                                <label key={type} className="flex items-center gap-2 text-[13px] dash-soft cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="accent-[var(--dash-ink)]"
                                        checked={formData.applicableToProductTypes.includes(type)}
                                        onChange={(e) => {
                                            const checked = e.target.checked
                                            setFormData(prev => ({
                                                ...prev,
                                                applicableToProductTypes: checked
                                                    ? [...prev.applicableToProductTypes, type]
                                                    : prev.applicableToProductTypes.filter(t => t !== type)
                                            }))
                                        }}
                                    />
                                    {TYPE_LABELS[type]} Products
                                </label>
                            ))}
                        </div>
                        <span className="text-[13px] dash-soft">Select product types this delivery option applies to</span>
                    </div>

                    {/* Formula-based pricing + live preview, side by side on desktop
                        so the preview is visible without scrolling (§9 directive). */}
                    <div className="border-t border-[var(--dash-line)] pt-4">
                        <h4 className="text-[13px] font-medium text-[var(--dash-ink)]">Automatic Pricing Formula</h4>
                        <p className="text-[13px] dash-soft mt-0.5 mb-3">
                            Price = Base Price + (Volume × Volume Factor) + (Weight × Weight Factor)
                        </p>

                        <div className={`grid grid-cols-1 gap-4 ${previewReady ? 'lg:grid-cols-[1fr_320px]' : ''}`}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 content-start">
                                {numberField('Base Price ($)', 'basePrice', { placeholder: '5.00', step: '0.01', help: 'Flat fee added to all deliveries' })}
                                {numberField('Volume Factor ($/cm³)', 'volumeFactor', { placeholder: '0.001', step: '0.0001', help: 'Cost per cubic centimeter' })}
                                {numberField('Weight Factor ($/g)', 'weightFactor', { placeholder: '0.01', step: '0.001', help: 'Cost per gram' })}
                                {numberField('Minimum Price ($)', 'minPrice', { placeholder: '5.00', step: '0.01', help: 'Floor price (never go below)' })}
                                {numberField('Maximum Price ($)', 'maxPrice', { placeholder: '50.00', step: '0.01', help: 'Ceiling price (never exceed)' })}
                                {numberField('Free Shipping Threshold ($)', 'freeShippingThreshold', { placeholder: '100.00', step: '0.01', help: 'Free if product value exceeds (optional)' })}
                            </div>

                            {/* Live preview — DottedRow mini-table (§5.14) */}
                            {previewReady && (
                                <div className="rounded-[var(--dash-r-inner)] border border-[var(--dash-line)] bg-[var(--dash-card)] p-4 self-start">
                                    <p className="dash-label mb-2">Example Calculations</p>
                                    <div className="flex flex-col">
                                        {PREVIEW_PRESETS.map(example => (
                                            <DottedRow key={example.label} label={`${example.label} · ${example.volume} cm³ · ${example.weight} g`}>
                                                ${clampPrice(formData.basePricing, example.volume, example.weight).toFixed(2)}
                                            </DottedRow>
                                        ))}
                                    </div>

                                    <div className="mt-3 border-t border-[var(--dash-line)] pt-3">
                                        <p className="dash-label mb-2">Test Your Own Example</p>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                value={customExample.volume}
                                                onChange={(e) => setCustomExample(prev => ({ ...prev, volume: e.target.value }))}
                                                className={`${inputCls()} text-right dash-data`}
                                                placeholder="Volume (cm³)"
                                                aria-label="Volume (cm³)"
                                                min="0"
                                                step="1"
                                            />
                                            <input
                                                type="number"
                                                value={customExample.weight}
                                                onChange={(e) => setCustomExample(prev => ({ ...prev, weight: e.target.value }))}
                                                className={`${inputCls()} text-right dash-data`}
                                                placeholder="Weight (g)"
                                                aria-label="Weight (g)"
                                                min="0"
                                                step="1"
                                            />
                                        </div>
                                        <div className="mt-2">
                                            {(() => {
                                                const volume = parseFloat(customExample.volume)
                                                const weight = parseFloat(customExample.weight)
                                                if (isNaN(parseFloat(bpForm.basePrice)) || isNaN(parseFloat(bpForm.volumeFactor)) ||
                                                    isNaN(parseFloat(bpForm.weightFactor)) || isNaN(volume) || isNaN(weight)) {
                                                    return <p className="text-[13px] dash-soft">Enter volume and weight to preview</p>
                                                }
                                                return (
                                                    <DottedRow label="Calculated price">
                                                        ${clampPrice(formData.basePricing, volume, weight).toFixed(2)}
                                                    </DottedRow>
                                                )
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </form>
            </Sheet>

            {/* Delete confirmation — never window.confirm (§4.10) */}
            <ConfirmDialog
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={confirmDelete}
                title="Delete this delivery type?"
                body={deleteTarget ? `"${deleteTarget.displayName}" will no longer be available to creators or customers.` : ''}
                confirmLabel="Delete"
                tone="bad"
                busy={deleteBusy}
            />

            {/* Guided tour (§9.11) */}
            <CoachMarks steps={TOURS.delivery} open={tourOpen} onClose={() => setTourOpen(false)} panelKey="delivery" />
        </div>
    )
}
