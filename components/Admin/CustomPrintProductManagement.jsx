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
import { GlassBar, DottedRow, SkeletonRow } from '@/components/dashboard-ui'
import { inputCls, labelCls } from '@/components/DashboardComponents/ProductFormFields/dashFormUi'
import { sunBtnCls } from './dashPanelUi'

// Flat document section (§5.10): dash-section heading + hairline rule — the
// grouping the shared fields' collapsible drawers used to provide.
function DocSection({ title, description, children, first = false }) {
    return (
        <section className={`py-6 ${first ? '' : 'border-t border-[var(--dash-line)]'}`}>
            <h3 className="dash-section">{title}</h3>
            {description && <p className="text-[13px] dash-soft mt-0.5 mb-4">{description}</p>}
            {!description && <div className="mb-4" />}
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
            {/* Save CTA lives in the GlassBar — the document's one primary action */}
            <GlassBar className="justify-between">
                <div className="min-w-0">
                    <p className="text-[13px] font-semibold truncate">Custom print product</p>
                    <p className="dash-data dash-soft truncate">
                        The base product behind “Order Print” — no variants.
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

            {/* Mini document (§5.10): flat headed sections at reading width */}
            <div className="max-w-[720px] mt-2">
                {product && (
                    <DottedRow label="Product ID" className="mt-2">
                        <span className="dash-data">{product._id}</span>
                    </DottedRow>
                )}

                <DocSection
                    title="Details & images"
                    description="What customers see on the storefront's custom print page."
                    first
                >
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
                        </div>

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
                    </div>
                </DocSection>

                <DocSection
                    title="Pricing"
                    description="Base price and platform credits applied to every custom print request."
                >
                    <PricingFields
                        form={form}
                        setForm={setForm}
                        allCurrencies={allCurrencies}
                    />
                </DocSection>

                {/* Delivery options for custom prints. The admin curates which
                    delivery types are offered and sets each price here; every
                    custom-print request copies these options + prices verbatim
                    (prices are NOT recalculated per model). Representative
                    dimensions can be entered to auto-price tier/formula types;
                    the resulting price can always be overridden per type. */}
                <DocSection
                    title="Delivery"
                    description="Delivery types offered on custom prints — each request copies these options and prices as-is."
                >
                    <ShippingFields
                        form={form}
                        handleChange={handleChange}
                        setForm={setForm}
                    />
                </DocSection>

                <DocSection
                    title="Discounts"
                    description="Optional discount settings, linkable to promotional events."
                >
                    <DiscountsField
                        form={form}
                        setForm={setForm}
                        events={events}
                    />
                </DocSection>
            </div>
        </div>
    )
}
