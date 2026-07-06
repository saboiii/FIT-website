'use client'
// Creator shop editor (/dashboard/shop) — the owner surface for the public
// /creators/[id] page. Chassis: rate card (§9.5) — grouped label+input+help
// rows in cards, primary Save at the section head. Banner (4:1 crop) and logo
// (square crop) reuse the blog editor's react-image-crop pipeline via
// ShopImageCropModal; images auto-save on upload (the upload route deletes
// the previous S3 object, so the DB pointer must move in the same action).
// Text fields, links, featured products and accent save via the Save button.
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useUser } from '@clerk/nextjs'
import { GoLinkExternal, GoPlus, GoX } from 'react-icons/go'
import { IoImageOutline } from 'react-icons/io5'
import { useToast } from '@/components/General/ToastProvider'
import { useShopIdentity, CreatorGate } from '@/components/DashboardComponents/CreatorShell'
import ShopImageCropModal from '@/components/DashboardComponents/ShopImageCropModal'
import { SkeletonRow } from '@/components/dashboard-ui'

const MAX_LINKS = 6
const MAX_FEATURED = 8
const MAX_DESCRIPTION = 600

// Small curated accent set (validated server-side as #rrggbb).
const ACCENT_PRESETS = ['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#111111']

const proxySrc = (key) => `/api/proxy?key=${encodeURIComponent(key)}`

const emptyShop = {
    bannerImage: '',
    logoImage: '',
    description: '',
    links: [],
    featuredProductIds: [],
    accentColor: '',
}

const normalizeUrl = (raw) => {
    const trimmed = String(raw || '').trim()
    if (!trimmed) return ''
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return `https://${trimmed}`
}

function FieldRow({ label, help, children }) {
    return (
        <div className="flex flex-col gap-1.5">
            <span className="dash-label">{label}</span>
            {children}
            {help && <span className="text-[12px] text-[var(--dash-ink-soft)]">{help}</span>}
        </div>
    )
}

function ShopEditor() {
    const { user } = useUser()
    const { displayName } = useShopIdentity()
    const { showToast } = useToast()

    const [shop, setShop] = useState(emptyShop)
    const [loaded, setLoaded] = useState(false)
    const [saving, setSaving] = useState(false)
    const [products, setProducts] = useState([])
    const [productsLoaded, setProductsLoaded] = useState(false)

    // Crop flow state: { kind: 'banner'|'logo', src: objectURL }
    const [cropState, setCropState] = useState(null)
    const [uploading, setUploading] = useState(false)
    const bannerInputRef = useRef(null)
    const logoInputRef = useRef(null)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const res = await fetch('/api/user/shop')
                if (!res.ok) return
                const data = await res.json()
                if (!cancelled && data?.shop) {
                    setShop({ ...emptyShop, ...data.shop })
                }
            } catch {
                // keep defaults; Save will surface errors
            } finally {
                if (!cancelled) setLoaded(true)
            }
        })()
        return () => { cancelled = true }
    }, [])

    useEffect(() => {
        if (!user) return
        let cancelled = false
        ;(async () => {
            try {
                const res = await fetch(`/api/product?creatorUserId=${user.id}`)
                const data = await res.json()
                const list = (data?.products || []).filter((p) => {
                    // Hide the special custom-print config product (same rule as
                    // the products list page).
                    const slug = p.slug || ''
                    const name = p.name || ''
                    return !(
                        (typeof slug === 'string' && slug.includes('custom-print')) ||
                        (typeof name === 'string' && name.toLowerCase().includes('custom 3d print')) ||
                        p._id === 'CP1_CUSTOM_PRINT_CONFIG'
                    )
                })
                if (!cancelled) setProducts(list)
            } catch {
                // featured picker shows the empty hint
            } finally {
                if (!cancelled) setProductsLoaded(true)
            }
        })()
        return () => { cancelled = true }
    }, [user])

    const shopHref = useMemo(() => {
        const slug = displayName || user?.id || ''
        return slug ? `/creators/${encodeURIComponent(slug)}` : null
    }, [displayName, user])

    const pickFile = (kind) => (e) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return
        if (!file.type.startsWith('image/')) {
            showToast('Please choose an image file', 'error')
            return
        }
        setCropState({ kind, src: URL.createObjectURL(file) })
    }

    // Upload the cropped blob, then move the DB pointer in the same action so
    // the shop never references a deleted key.
    const uploadCropped = async (blob) => {
        const kind = cropState?.kind
        if (!kind) return
        const field = kind === 'banner' ? 'bannerImage' : 'logoImage'
        try {
            setUploading(true)
            const formData = new FormData()
            formData.append('file', new File([blob], `${kind}.jpg`, { type: 'image/jpeg' }))
            formData.append('kind', kind)
            if (shop[field]) formData.append('existingKey', shop[field])
            const res = await fetch('/api/user/shop/upload', { method: 'POST', body: formData })
            const data = await res.json().catch(() => ({}))
            if (!res.ok || !data.key) throw new Error(data.error || 'Upload failed')

            const put = await fetch('/api/user/shop', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: data.key }),
            })
            if (!put.ok) throw new Error('Failed to save image')

            setShop((prev) => ({ ...prev, [field]: data.key }))
            showToast(kind === 'banner' ? 'Banner updated' : 'Logo updated', 'success')
        } catch (err) {
            showToast(err?.message || 'Upload failed', 'error')
        } finally {
            setUploading(false)
            if (cropState?.src) URL.revokeObjectURL(cropState.src)
            setCropState(null)
        }
    }

    const removeImage = async (kind) => {
        const field = kind === 'banner' ? 'bannerImage' : 'logoImage'
        try {
            const res = await fetch('/api/user/shop', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: '' }),
            })
            if (!res.ok) throw new Error('Failed to remove image')
            setShop((prev) => ({ ...prev, [field]: '' }))
            showToast(kind === 'banner' ? 'Banner removed' : 'Logo removed', 'success')
        } catch (err) {
            showToast(err?.message || 'Failed to remove image', 'error')
        }
    }

    const updateLink = (index, patch) => {
        setShop((prev) => ({
            ...prev,
            links: prev.links.map((l, i) => (i === index ? { ...l, ...patch } : l)),
        }))
    }

    const addLink = () => {
        setShop((prev) =>
            prev.links.length >= MAX_LINKS
                ? prev
                : { ...prev, links: [...prev.links, { label: '', url: '' }] }
        )
    }

    const removeLink = (index) => {
        setShop((prev) => ({ ...prev, links: prev.links.filter((_, i) => i !== index) }))
    }

    // Featured order = click order; a re-click removes.
    const toggleFeatured = (productId) => {
        setShop((prev) => {
            const id = String(productId)
            if (prev.featuredProductIds.includes(id)) {
                return { ...prev, featuredProductIds: prev.featuredProductIds.filter((x) => x !== id) }
            }
            if (prev.featuredProductIds.length >= MAX_FEATURED) {
                showToast(`You can feature up to ${MAX_FEATURED} products`, 'error')
                return prev
            }
            return { ...prev, featuredProductIds: [...prev.featuredProductIds, id] }
        })
    }

    const save = async () => {
        const cleanLinks = shop.links
            .map((l) => ({ label: String(l.label || '').trim(), url: normalizeUrl(l.url) }))
            .filter((l) => l.label && l.url)
        try {
            setSaving(true)
            const res = await fetch('/api/user/shop', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    description: shop.description,
                    links: cleanLinks,
                    featuredProductIds: shop.featuredProductIds,
                    accentColor: shop.accentColor,
                }),
            })
            const data = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(data.error || 'Failed to save shop')
            if (data.shop) setShop({ ...emptyShop, ...data.shop })
            showToast('Shop saved', 'success')
        } catch (err) {
            showToast(err?.message || 'Failed to save shop', 'error')
        } finally {
            setSaving(false)
        }
    }

    const shopName = displayName || user?.firstName || 'Your shop'

    return (
        <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3 flex-wrap">
                <h1 className="dash-title flex-1">My shop</h1>
                {shopHref && (
                    <Link
                        href={shopHref}
                        className="dash-hoverable flex items-center gap-1.5 rounded-full border border-[var(--dash-line)] bg-[var(--dash-card)] px-4 py-2 text-[13px] font-medium hover:bg-[var(--dash-canvas)]"
                    >
                        View shop
                        <GoLinkExternal aria-hidden="true" />
                    </Link>
                )}
                <button
                    type="button"
                    onClick={save}
                    disabled={saving || !loaded}
                    className="dash-hoverable rounded-full px-4 py-2 text-[13px] font-medium bg-[var(--dash-ink)] text-[var(--dash-canvas)] cursor-pointer disabled:opacity-50 active:scale-[0.97]"
                >
                    {saving ? 'Saving...' : 'Save'}
                </button>
            </div>

            {!loaded ? (
                <div className="flex flex-col gap-2">
                    <SkeletonRow />
                    <SkeletonRow />
                    <SkeletonRow />
                </div>
            ) : (
                <>
                    {/* Live mini preview of the public header */}
                    <div className="bg-[var(--dash-card)] border border-[var(--dash-line)] rounded-[var(--dash-r-card)] shadow-[var(--dash-shadow-card)] overflow-hidden">
                        <div
                            data-testid="preview-banner"
                            className="relative h-24 w-full bg-[var(--dash-canvas)]"
                            style={shop.accentColor && !shop.bannerImage ? { backgroundColor: `${shop.accentColor}14` } : undefined}
                        >
                            {shop.bannerImage && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={proxySrc(shop.bannerImage)} alt="Banner preview" className="absolute inset-0 h-full w-full object-cover" />
                            )}
                        </div>
                        <div className="relative z-10 flex items-end gap-3 px-4 pb-3 -mt-6">
                            <div className="h-12 w-12 rounded-full border border-[var(--dash-line)] bg-[var(--dash-card)] overflow-hidden flex items-center justify-center shrink-0">
                                {shop.logoImage ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={proxySrc(shop.logoImage)} alt="Logo preview" className="h-full w-full object-cover" />
                                ) : (
                                    <span className="text-[15px] font-semibold text-[var(--dash-ink-soft)] select-none">
                                        {shopName.charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <span className="text-[15px] font-semibold truncate pb-1">{shopName}</span>
                        </div>
                    </div>

                    {/* Images */}
                    <div className="bg-[var(--dash-card)] border border-[var(--dash-line)] rounded-[var(--dash-r-card)] shadow-[var(--dash-shadow-card)] p-5 flex flex-col gap-5">
                        <h2 className="dash-section">Images</h2>
                        <FieldRow label="Banner" help="Wide image across the top of your shop page. Cropped to about 4:1.">
                            <div className="flex items-center gap-2 flex-wrap">
                                <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={pickFile('banner')} aria-label="Upload banner image" />
                                <button
                                    type="button"
                                    onClick={() => bannerInputRef.current?.click()}
                                    className="dash-hoverable flex items-center gap-1.5 rounded-full border border-[var(--dash-line)] bg-[var(--dash-card)] px-4 py-2 text-[13px] font-medium hover:bg-[var(--dash-canvas)] cursor-pointer"
                                >
                                    <IoImageOutline aria-hidden="true" />
                                    {shop.bannerImage ? 'Replace banner' : 'Upload banner'}
                                </button>
                                {shop.bannerImage && (
                                    <button
                                        type="button"
                                        onClick={() => removeImage('banner')}
                                        className="text-[13px] dash-soft hover:text-[var(--dash-ink)] cursor-pointer"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        </FieldRow>
                        <FieldRow label="Logo" help="Round shop logo. Cropped square; shown over the banner.">
                            <div className="flex items-center gap-2 flex-wrap">
                                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={pickFile('logo')} aria-label="Upload logo image" />
                                <button
                                    type="button"
                                    onClick={() => logoInputRef.current?.click()}
                                    className="dash-hoverable flex items-center gap-1.5 rounded-full border border-[var(--dash-line)] bg-[var(--dash-card)] px-4 py-2 text-[13px] font-medium hover:bg-[var(--dash-canvas)] cursor-pointer"
                                >
                                    <IoImageOutline aria-hidden="true" />
                                    {shop.logoImage ? 'Replace logo' : 'Upload logo'}
                                </button>
                                {shop.logoImage && (
                                    <button
                                        type="button"
                                        onClick={() => removeImage('logo')}
                                        className="text-[13px] dash-soft hover:text-[var(--dash-ink)] cursor-pointer"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        </FieldRow>
                        <FieldRow label="Accent" help="Optional colour used for small highlights on your shop page.">
                            <div className="flex items-center gap-2">
                                {ACCENT_PRESETS.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        aria-label={`Accent ${color}`}
                                        aria-pressed={shop.accentColor === color}
                                        onClick={() => setShop((prev) => ({ ...prev, accentColor: prev.accentColor === color ? '' : color }))}
                                        className={`h-7 w-7 rounded-full cursor-pointer border ${shop.accentColor === color ? 'border-[var(--dash-ink)] ring-2 ring-[var(--dash-line)]' : 'border-[var(--dash-line)]'}`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setShop((prev) => ({ ...prev, accentColor: '' }))}
                                    className="text-[13px] dash-soft hover:text-[var(--dash-ink)] cursor-pointer ml-1"
                                >
                                    None
                                </button>
                            </div>
                        </FieldRow>
                    </div>

                    {/* About */}
                    <div className="bg-[var(--dash-card)] border border-[var(--dash-line)] rounded-[var(--dash-r-card)] shadow-[var(--dash-shadow-card)] p-5 flex flex-col gap-5">
                        <h2 className="dash-section">About</h2>
                        <FieldRow label="Description" help="Shown under your shop name. Plain text.">
                            <textarea
                                value={shop.description}
                                maxLength={MAX_DESCRIPTION}
                                rows={4}
                                aria-label="Shop description"
                                placeholder="Tell buyers what you make and why it is great."
                                onChange={(e) => setShop((prev) => ({ ...prev, description: e.target.value }))}
                                className="w-full rounded-[var(--dash-r-inner)] border border-[var(--dash-line)] bg-[var(--dash-card)] px-3 py-2 text-[13px] resize-y"
                            />
                            <span className="dash-data dash-soft self-end">{shop.description.length}/{MAX_DESCRIPTION}</span>
                        </FieldRow>
                        <FieldRow label={`Links (${shop.links.length}/${MAX_LINKS})`} help="Up to 6 external links, shown as chips under your name.">
                            <div className="flex flex-col gap-2">
                                {shop.links.map((link, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <input
                                            value={link.label}
                                            maxLength={40}
                                            placeholder="Label"
                                            aria-label={`Link ${i + 1} label`}
                                            onChange={(e) => updateLink(i, { label: e.target.value })}
                                            className="w-36 rounded-[var(--dash-r-inner)] border border-[var(--dash-line)] bg-[var(--dash-card)] px-3 py-1.5 text-[13px]"
                                        />
                                        <input
                                            value={link.url}
                                            maxLength={300}
                                            placeholder="https://example.com"
                                            aria-label={`Link ${i + 1} URL`}
                                            onChange={(e) => updateLink(i, { url: e.target.value })}
                                            className="flex-1 min-w-0 rounded-[var(--dash-r-inner)] border border-[var(--dash-line)] bg-[var(--dash-card)] px-3 py-1.5 text-[13px]"
                                        />
                                        <button
                                            type="button"
                                            aria-label={`Remove link ${i + 1}`}
                                            onClick={() => removeLink(i)}
                                            className="dash-hoverable h-7 w-7 grid place-items-center rounded-full text-[var(--dash-ink-soft)] hover:text-[var(--dash-ink)] hover:bg-[var(--dash-canvas)] cursor-pointer shrink-0"
                                        >
                                            <GoX aria-hidden="true" />
                                        </button>
                                    </div>
                                ))}
                                {shop.links.length < MAX_LINKS && (
                                    <button
                                        type="button"
                                        onClick={addLink}
                                        className="dash-hoverable flex items-center gap-1.5 w-fit rounded-full border border-[var(--dash-line)] bg-[var(--dash-card)] px-3 py-1.5 text-[13px] font-medium hover:bg-[var(--dash-canvas)] cursor-pointer"
                                    >
                                        <GoPlus aria-hidden="true" />
                                        Add link
                                    </button>
                                )}
                            </div>
                        </FieldRow>
                    </div>

                    {/* Featured products */}
                    <div className="bg-[var(--dash-card)] border border-[var(--dash-line)] rounded-[var(--dash-r-card)] shadow-[var(--dash-shadow-card)] p-5 flex flex-col gap-4">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="dash-section">Featured products</h2>
                            <span className="dash-data dash-soft">{shop.featuredProductIds.length}/{MAX_FEATURED}</span>
                        </div>
                        <p className="text-[12px] text-[var(--dash-ink-soft)]">
                            Click to feature; click again to remove. They appear on your shop page in the order you pick them.
                        </p>
                        {!productsLoaded ? (
                            <div className="flex flex-col gap-2">
                                <SkeletonRow />
                                <SkeletonRow />
                            </div>
                        ) : products.length === 0 ? (
                            <p className="text-[13px] text-[var(--dash-ink-soft)]">
                                No products yet. Create products first, then feature your best ones here.
                            </p>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {products.map((product) => {
                                    const id = String(product._id)
                                    const order = shop.featuredProductIds.indexOf(id)
                                    const selected = order >= 0
                                    const image = product.images?.[0]
                                    return (
                                        <button
                                            key={id}
                                            type="button"
                                            aria-pressed={selected}
                                            onClick={() => toggleFeatured(id)}
                                            className={`dash-hoverable relative flex flex-col gap-2 rounded-[var(--dash-r-inner)] border p-2 text-left cursor-pointer ${
                                                selected
                                                    ? 'border-[var(--dash-ink)] bg-[var(--dash-canvas)]'
                                                    : 'border-[var(--dash-line)] bg-[var(--dash-card)] hover:bg-[var(--dash-canvas)]'
                                            }`}
                                        >
                                            {image ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={proxySrc(image)}
                                                    alt=""
                                                    className="w-full aspect-square object-cover rounded-[var(--dash-r-inner)] border border-[var(--dash-line)]"
                                                />
                                            ) : (
                                                <span aria-hidden="true" className="dash-hatch w-full aspect-square rounded-[var(--dash-r-inner)] border border-[var(--dash-line)] inline-block" />
                                            )}
                                            <span className="text-[12px] font-medium truncate">{product.name}</span>
                                            {selected && (
                                                <span className="absolute top-3 right-3 h-6 w-6 grid place-items-center rounded-full bg-[var(--dash-ink)] text-[var(--dash-canvas)] text-[11px] font-semibold">
                                                    {order + 1}
                                                </span>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}

            {cropState && (
                <ShopImageCropModal
                    src={cropState.src}
                    aspect={cropState.kind === 'banner' ? 4 : 1}
                    circular={cropState.kind === 'logo'}
                    title={cropState.kind === 'banner' ? 'Crop banner' : 'Crop logo'}
                    busy={uploading}
                    onCancel={() => {
                        if (!uploading) {
                            URL.revokeObjectURL(cropState.src)
                            setCropState(null)
                        }
                    }}
                    onConfirm={uploadCropped}
                />
            )}
        </div>
    )
}

export default function GatedShopEditor() {
    return (
        <CreatorGate>
            <ShopEditor />
        </CreatorGate>
    )
}
