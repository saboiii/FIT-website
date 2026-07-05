'use client'
import { useState, useEffect, useRef } from 'react'
import { useToast } from '@/components/General/ToastProvider'
import PricingFields from '@/components/DashboardComponents/ProductFormFields/PricingFields'
import ShippingFields from '@/components/DashboardComponents/ProductFormFields/ShippingFields'
import DiscountsField from '@/components/DashboardComponents/ProductFormFields/DiscountsField'
const DIMENSION_FIELDS = new Set(['length', 'width', 'height', 'weight'])
import ImagesField from '@/components/DashboardComponents/ProductFormFields/ImagesField'
import { uploadImages } from '@/utils/uploadHelpers'
import {
    handleImageChange as handleImageChangeHelper,
    handleImageDrop as handleImageDropHelper,
    handleRemoveImage as handleRemoveImageHelper,
} from '@/utils/formHelpers'
import { GlassBar, SkeletonRow } from '@/components/dashboard-ui'
import { inputCls, labelCls, quietBtnCls } from '@/components/DashboardComponents/ProductFormFields/dashFormUi'
import { sunBtnCls } from './dashPanelUi'

/**
 * Custom print product (§5.10 + §9.5 document chassis): one long form split
 * into numbered chapters, each a small chunk with plain-language helper copy
 * (Hick's law / chunking). A mini table-of-contents rail carries jump links
 * and per-chapter done/todo dots; the sticky GlassBar shows a completeness
 * summary beside the one save action. Rare settings (discounts) sit behind a
 * disclosure. Every field and payload is unchanged, only relocated.
 */
const CHAPTERS = [
    { id: 'basics', num: 1, title: 'Basics', blurb: 'The name and description customers see when they order a custom print.' },
    { id: 'photos', num: 2, title: 'Photos', blurb: 'Example photos that show customers what your custom prints look like.' },
    { id: 'pricing', num: 3, title: 'Pricing', blurb: 'The starting price every custom print request begins from.' },
    { id: 'delivery', num: 4, title: 'Delivery', blurb: 'How finished prints reach the customer. Each request copies these options and prices as they are.' },
    { id: 'discounts', num: 5, title: 'Discounts', blurb: 'Optional. Money off the base price, on its own or tied to a promotional event.', optional: true },
]

// Chapter completeness dot: ink = done, hatch = still to do (§4.8 #14).
function ChapterDot({ done }) {
    return (
        <span
            aria-hidden="true"
            className={`h-3 w-3 shrink-0 rounded-full ${done
                ? 'bg-[var(--dash-ink)]'
                : 'dash-hatch border border-[var(--dash-line)] bg-[var(--dash-card)]'
                }`}
        />
    )
}

// One numbered chapter of the document: node + title + one-line helper copy.
function Chapter({ id, num, title, blurb, done, optional, first = false, children }) {
    return (
        <section id={`cpp-${id}`} className={`scroll-mt-24 py-6 ${first ? '' : 'border-t border-[var(--dash-line)]'}`}>
            <div className="flex items-center gap-2.5">
                <span
                    aria-hidden="true"
                    className={`h-6 w-6 shrink-0 grid place-items-center rounded-full dash-data ${done
                        ? 'bg-[var(--dash-ink)] text-[var(--dash-canvas)]'
                        : 'dash-hatch border border-[var(--dash-line)] bg-[var(--dash-card)] text-[var(--dash-ink)]'
                        }`}
                >
                    {num}
                </span>
                <h3 className="dash-section">{title}</h3>
                {optional && <span className="dash-label">Optional</span>}
            </div>
            <p className="text-[13px] dash-soft mt-1.5 mb-4">{blurb}</p>
            {children}
        </section>
    )
}

export default function CustomPrintProductManagement() {
    const [product, setProduct] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [events, setEvents] = useState([])
    const [allCurrencies] = useState(['SGD', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'CNY', 'HKD', 'MYR', 'THB', 'INR'])
    // Discounts are the rare chapter: fields stay collapsed until asked for,
    // unless a discount is already configured (progressive disclosure).
    const [discountsRevealed, setDiscountsRevealed] = useState(false)
    const { showToast } = useToast()

    // Image upload state
    const imageInputRef = useRef(null)
    const [pendingImages, setPendingImages] = useState([])
    const [imageValidationErrors, setImageValidationErrors] = useState([])

    const [form, setForm] = useState({
        name: 'Custom 3D Print',
        description: '',
        images: [],
        basePrice: {
            presentmentCurrency: 'SGD',
            presentmentAmount: 0
        },
        priceCredits: 0,
        delivery: {
            deliveryTypes: []
        },
        dimensions: { length: '', width: '', height: '', weight: '' },
        discount: {
            eventId: '',
            percentage: '',
            minimumPrice: '',
            startDate: '',
            endDate: '',
            tiers: [],
        },
        showDiscount: false,
        productType: 'print'
    })

    useEffect(() => {
        loadProduct()
        loadEvents()
    }, [])

    const loadEvents = async () => {
        try {
            const response = await fetch('/api/admin/events')
            if (response.ok) {
                const data = await response.json()
                setEvents(data.events || [])
            }
        } catch (error) {
            console.error('Error loading events:', error)
        }
    }

    const loadProduct = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/product/custom-print-config')
            if (response.ok) {
                const data = await response.json()
                if (data.product) {
                    setProduct(data.product)
                    setForm({
                        name: data.product.name || 'Custom 3D Print',
                        description: data.product.description || '',
                        images: data.product.images || [],
                        basePrice: data.product.basePrice || { presentmentCurrency: 'SGD', presentmentAmount: 0 },
                        priceCredits: data.product.priceCredits || 0,
                        delivery: data.product.delivery || { deliveryTypes: [] },
                        dimensions: data.product.dimensions || { length: '', width: '', height: '', weight: '' },
                        discount: data.product.discount || { eventId: '', percentage: '', minimumPrice: '', startDate: '', endDate: '' },
                        showDiscount: !!data.product.discount?.percentage || !!data.product.discount?.eventId,
                        productType: 'print'
                    })
                }
            }
        } catch (error) {
            console.error('Error loading custom print product:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (e) => {
        const { name, value } = e.target

        // Dimension inputs (used by ShippingFields) live under form.dimensions.
        if (DIMENSION_FIELDS.has(name)) {
            setForm(prev => ({
                ...prev,
                dimensions: {
                    ...prev.dimensions,
                    [name]: value === '' ? '' : Number(value),
                },
            }))
            return
        }

        setForm(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleSave = async () => {
        setSaving(true)
        let uploadedImages = []
        let allUploadedFiles = []

        try {
            // Upload images first
            if (pendingImages.length > 0) {
                uploadedImages = await uploadImages(pendingImages)
                allUploadedFiles.push(...uploadedImages)
            }

            const normalizedBasePrice = {
                presentmentCurrency: form.basePrice.presentmentCurrency,
                presentmentAmount: form.basePrice.presentmentAmount === '' ? 0 : parseFloat(form.basePrice.presentmentAmount) || 0
            }

            const normalizedPriceCredits = form.priceCredits === '' ? 0 : parseInt(form.priceCredits) || 0

            const response = await fetch('/api/product/custom-print-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name,
                    description: form.description,
                    images: [...(form.images || []), ...uploadedImages],
                    basePrice: normalizedBasePrice,
                    priceCredits: normalizedPriceCredits,
                    delivery: form.delivery,
                    dimensions: form.dimensions,
                    discount: form.showDiscount ? form.discount : {}
                })
            })

            if (response.ok) {
                showToast('Custom print product updated successfully!', 'success')
                setPendingImages([])
                loadProduct()
            } else {
                const error = await response.json()

                // Cleanup uploaded files on error
                if (allUploadedFiles.length > 0) {
                    try {
                        await fetch('/api/asset', {
                            method: 'DELETE',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ keys: allUploadedFiles })
                        })
                    } catch (cleanupError) {
                        console.error('Error cleaning up uploaded files:', cleanupError)
                    }
                }

                throw new Error(error.error || 'Failed to update product')
            }
        } catch (error) {
            console.error('Error saving:', error)
            showToast(error.message || 'Failed to update product', 'error')
        } finally {
            setSaving(false)
        }
    }

    // Image upload handlers
    const handleImageChange = (e) => handleImageChangeHelper(e, setPendingImages, setImageValidationErrors)
    const handleImageDrop = (fileList) => handleImageDropHelper(fileList, setPendingImages, setImageValidationErrors)
    const handleRemoveImage = (idx) => handleRemoveImageHelper(idx, form, setForm, pendingImages, setPendingImages, imageInputRef, setImageValidationErrors)

    // Per-chapter completeness for the rail dots and the save-bar summary.
    const done = {
        basics: (form.name || '').trim().length > 0 && (form.description || '').trim().length > 0,
        photos: (form.images?.length || 0) + pendingImages.length > 0,
        pricing: form.basePrice?.presentmentAmount !== '' && Number(form.basePrice?.presentmentAmount) > 0,
        delivery: (form.delivery?.deliveryTypes?.length || 0) > 0,
        discounts: !!form.showDiscount,
    }
    const requiredChapters = CHAPTERS.filter((c) => !c.optional)
    const readyCount = requiredChapters.filter((c) => done[c.id]).length

    // Jump links never animate (keyboard-initiated navigation, §4.5 rules).
    const jumpTo = (id) => {
        if (typeof document !== 'undefined') {
            document.getElementById(`cpp-${id}`)?.scrollIntoView({ block: 'start' })
        }
    }

    const discountsOpen = discountsRevealed || form.showDiscount

    const railLink = (c) => (
        <button
            key={c.id}
            type="button"
            onClick={() => jumpTo(c.id)}
            className="dash-hoverable flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium text-[var(--dash-ink-soft)] hover:bg-[var(--dash-sun-soft)] hover:text-[var(--dash-ink)] cursor-pointer text-left"
        >
            <ChapterDot done={done[c.id]} />
            <span>{c.num}. {c.title}</span>
        </button>
    )

    if (loading) {
        return (
            <div className="p-4 md:p-6 flex flex-col gap-3" aria-label="Loading custom print product">
                {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonRow key={i} />
                ))}
            </div>
        )
    }

    return (
        <div className="p-4 md:p-6">
            {/* Sticky save bar: the one primary action + completeness summary */}
            <GlassBar className="justify-between">
                <div className="min-w-0">
                    <p className="text-[13px] font-semibold truncate">Custom print product</p>
                    <p className="dash-data dash-soft truncate">
                        {readyCount} of {requiredChapters.length} sections ready
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || loading}
                    className={`${sunBtnCls} shrink-0`}
                >
                    {saving ? 'Saving…' : 'Save configuration'}
                </button>
            </GlassBar>

            {/* Compact jump pills where the rail does not fit (§4.8 #14) */}
            <nav aria-label="Form sections" className="xl:hidden flex items-center gap-1.5 flex-wrap mt-3">
                {CHAPTERS.map((c) => (
                    <button
                        key={c.id}
                        type="button"
                        onClick={() => jumpTo(c.id)}
                        className={`${quietBtnCls} flex items-center gap-1.5 px-3 py-1`}
                    >
                        <ChapterDot done={done[c.id]} />
                        {c.num}. {c.title}
                    </button>
                ))}
            </nav>

            <div className="flex items-start gap-8 mt-2">
                {/* The document: numbered chapters at reading width */}
                <div className="flex-1 min-w-0 max-w-[720px]">
                    <p className="text-[13px] dash-soft mt-2">
                        The single storefront product behind “Order Print”. Every custom
                        print request starts from what you set here.
                    </p>

                    <Chapter {...CHAPTERS[0]} done={done.basics} first>
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="name" className={labelCls}>Product name</label>
                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    value={form.name}
                                    onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                                    className={inputCls()}
                                    placeholder="Custom 3D Print"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="description" className={labelCls}>Description</label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={form.description}
                                    onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                                    className={`${inputCls()} min-h-32`}
                                    placeholder="Describe your custom 3D printing service..."
                                />
                                <p className="text-[11px] font-medium dash-soft">
                                    Plain language works best: what customers can order and what happens after they do.
                                </p>
                            </div>
                        </div>
                    </Chapter>

                    <Chapter {...CHAPTERS[1]} done={done.photos}>
                        <ImagesField
                            images={form.images}
                            imageValidationErrors={imageValidationErrors}
                            imageInputRef={imageInputRef}
                            handleImageChange={handleImageChange}
                            handleImageDrop={handleImageDrop}
                            handleRemoveImage={handleRemoveImage}
                            pendingImages={pendingImages}
                            setImageValidationErrors={setImageValidationErrors}
                        />
                    </Chapter>

                    <Chapter {...CHAPTERS[2]} done={done.pricing}>
                        <PricingFields
                            form={form}
                            setForm={setForm}
                            allCurrencies={allCurrencies}
                        />
                    </Chapter>

                    {/* Delivery options for custom prints. The admin curates which
                        delivery types are offered and sets each price here; every
                        custom-print request copies these options + prices verbatim
                        (prices are NOT recalculated per model). Representative
                        dimensions can be entered to auto-price tier/formula types;
                        the resulting price can always be overridden per type. */}
                    <Chapter {...CHAPTERS[3]} done={done.delivery}>
                        <ShippingFields
                            form={form}
                            handleChange={handleChange}
                            setForm={setForm}
                        />
                    </Chapter>

                    <Chapter {...CHAPTERS[4]} done={done.discounts} optional>
                        {discountsOpen ? (
                            <DiscountsField
                                form={form}
                                setForm={setForm}
                                events={events}
                            />
                        ) : (
                            <button
                                type="button"
                                onClick={() => setDiscountsRevealed(true)}
                                className={quietBtnCls}
                            >
                                Set up a discount
                            </button>
                        )}
                    </Chapter>
                </div>

                {/* Mini table-of-contents rail: jump links + done/todo dots and
                    the quiet product meta (§4.8 #14 chassis, composed inline) */}
                <nav aria-label="Form contents" className="hidden xl:flex flex-col gap-1 sticky top-20 w-52 shrink-0">
                    <p className="dash-label px-3 mb-1">Contents</p>
                    {CHAPTERS.map(railLink)}
                    <div className="mt-3 pt-3 px-3 border-t border-[var(--dash-line)]">
                        <p className="dash-label">Ready to save</p>
                        <p className="dash-data mt-1">{readyCount} of {requiredChapters.length} sections</p>
                        {product && (
                            <p className="font-mono text-[11px] font-medium dash-soft mt-2 truncate" title={`Product ID ${product._id}`}>
                                ID {product._id}
                            </p>
                        )}
                    </div>
                </nav>
            </div>
        </div>
    )
}
