'use client'
// Creator products list — "the stockroom shelf" (blueprint §5.4).
// Hero: the table itself. GlassBar carries the WORKING name search and the
// view's sun CTA; ViewTabs derive Live/Hidden/Out-of-stock client-side;
// name & numberSold sorts are fixed (they compared the wrong fields before).

import { useUser } from '@clerk/nextjs'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useEffect, useMemo, useState } from 'react'
import { GoChevronDown, GoChevronUp, GoPlus } from 'react-icons/go'
import { IoStatsChartOutline, IoStorefrontOutline } from 'react-icons/io5'
import { ComingSoon, DashProvider, EmptyState, GlassBar, PeekPanel, SkeletonRow, StatusPill, ViewTabs } from '@/components/dashboard-ui'
import { currencyPrefix, formatMoney } from '@/components/DashboardComponents/format'

// Tailwind needs literal class strings (no runtime interpolation of variants).
const HEAD_COLS = 'grid-cols-[40px_minmax(0,1fr)_110px_70px_70px_110px_230px]'
const ROW_COLS = 'grid-cols-[40px_minmax(0,1fr)_110px] md:grid-cols-[40px_minmax(0,1fr)_110px_70px_70px_110px_230px]'

// Out of stock: not infinite AND (all per-option stocks 0 when options carry
// stock, otherwise total stock 0).
function isOutOfStock(product) {
    if (product.infiniteStock) return false
    const optionStocks = (product.variantTypes || [])
        .flatMap((vt) => (vt.options || []).map((o) => o.stock))
        .filter((s) => s !== undefined && s !== null)
    if (optionStocks.length > 0) return optionStocks.every((s) => Number(s) <= 0)
    return !(Number(product.stock) > 0)
}

function stockDisplay(product) {
    if (product.infiniteStock) return '∞'
    const optionStocks = (product.variantTypes || [])
        .flatMap((vt) => (vt.options || []).map((o) => o.stock))
        .filter((s) => s !== undefined && s !== null)
    if (optionStocks.length > 0) return optionStocks.reduce((a, b) => a + (Number(b) || 0), 0)
    return Number.isFinite(Number(product.stock)) ? Number(product.stock) : 0
}

function statusOf(product) {
    if (product.hidden) return { label: 'Hidden', tone: 'hatch' }
    if (isOutOfStock(product)) return { label: 'Out of stock', tone: 'bad' }
    return { label: 'Live', tone: 'ok' }
}

function SortHeader({ label, field, sort, onSort, align = 'left' }) {
    const active = sort.field === field
    return (
        <button
            type="button"
            onClick={() => onSort(field)}
            aria-label={`Sort by ${label}`}
            className={`dash-label flex items-center gap-1 cursor-pointer hover:text-[var(--dash-ink)] ${align === 'right' ? 'justify-end' : ''}`}
        >
            {label}
            {active && (sort.dir === 'asc' ? <GoChevronUp aria-hidden="true" /> : <GoChevronDown aria-hidden="true" />)}
        </button>
    )
}

function MyProducts() {
    const { user } = useUser();
    const router = useRouter();
    const [myProducts, setMyProducts] = useState([]);
    const [loaded, setLoaded] = useState(false);
    const [query, setQuery] = useState('');
    const [tab, setTab] = useState('all');
    const [sort, setSort] = useState({ field: 'createdAt', dir: 'desc' });
    // Per-product analytics peek — honest stub (openspec add-creator-product-analytics).
    const [peekProduct, setPeekProduct] = useState(null);

    useEffect(() => {
        if (!user) return;
        const fetchProducts = async () => {
            const res = await fetch(`/api/product?creatorUserId=${user.id}`);
            const data = await res.json();
            if (data.products && data.products.length > 0) {
                // Hide the special Custom 3D Print config product from this list;
                // it is managed via the dedicated admin tab instead.
                const filtered = data.products.filter(p => {
                    // Filter by known slug/id/name patterns used for custom print config
                    const slug = p.slug || p.handle || '';
                    const name = p.name || '';
                    const isCustomPrintSlug = typeof slug === 'string' && slug.includes('custom-print');
                    const isCustomPrintName = typeof name === 'string' && name.toLowerCase().includes('custom 3d print');
                    const isCustomPrintId = p._id === 'CP1_CUSTOM_PRINT_CONFIG';
                    return !(isCustomPrintSlug || isCustomPrintName || isCustomPrintId);
                });

                setMyProducts(filtered);
            }
            setLoaded(true);
        };
        fetchProducts();
    }, [user]);

    const counts = useMemo(() => ({
        all: myProducts.length,
        live: myProducts.filter((p) => !p.hidden).length,
        hidden: myProducts.filter((p) => p.hidden).length,
        out: myProducts.filter((p) => isOutOfStock(p)).length,
    }), [myProducts])

    const visibleProducts = useMemo(() => {
        const q = query.trim().toLowerCase()
        let list = myProducts
        if (q) list = list.filter((p) => (p.name || '').toLowerCase().includes(q))
        if (tab === 'live') list = list.filter((p) => !p.hidden)
        if (tab === 'hidden') list = list.filter((p) => p.hidden)
        if (tab === 'out') list = list.filter((p) => isOutOfStock(p))

        const sorted = [...list]
        sorted.sort((a, b) => {
            const dir = sort.dir === 'asc' ? 1 : -1
            if (sort.field === 'name') {
                return (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase()) * dir
            }
            if (sort.field === 'numberSold') {
                return ((Number(a.numberSold) || 0) - (Number(b.numberSold) || 0)) * dir
            }
            if (sort.field === 'createdAt') {
                return (new Date(a.createdAt || 0) - new Date(b.createdAt || 0)) * dir
            }
            return 0
        })
        return sorted
    }, [myProducts, query, tab, sort])

    const handleSort = (field) => {
        setSort((prev) => prev.field === field
            ? { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
            : { field, dir: 'asc' })
    }

    const goCreate = () => router.push('/dashboard/products/create')

    return (
        <DashProvider>
            <div className="mx-auto w-full max-w-[1200px] px-6 py-12 flex flex-col gap-4">
                <h1 className="dash-title">Products</h1>

                <GlassBar>
                    <input
                        type="search"
                        aria-label="Search products"
                        placeholder="Search products…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="flex-1 min-w-0 bg-transparent text-[13px] px-2 py-1.5 focus:outline-none"
                    />
                    <Link
                        href="/dashboard/products/create"
                        className="dash-hoverable flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium bg-[var(--dash-sun)] text-[var(--dash-ink)] hover:bg-[var(--dash-sun-deep)] active:scale-[0.97] shrink-0"
                    >
                        New Product
                        <GoPlus aria-hidden="true" />
                    </Link>
                </GlassBar>

                <ViewTabs
                    tabs={[
                        { key: 'all', label: 'All', count: counts.all },
                        { key: 'live', label: 'Live', count: counts.live },
                        { key: 'hidden', label: 'Hidden', count: counts.hidden },
                        { key: 'out', label: 'Out of stock', count: counts.out },
                    ]}
                    active={tab}
                    onChange={setTab}
                />

                {!loaded ? (
                    <div className="flex flex-col gap-2 mt-2">
                        <SkeletonRow />
                        <SkeletonRow />
                        <SkeletonRow />
                    </div>
                ) : myProducts.length === 0 ? (
                    <div className="bg-[var(--dash-card)] border border-[var(--dash-line)] rounded-[var(--dash-r-card)] shadow-[var(--dash-shadow-card)]">
                        <EmptyState
                            icon={<IoStorefrontOutline />}
                            title="Stock Your Shelf"
                            body="Products you create appear here — add photos, pricing, and delivery once, then sell on the storefront."
                            cta="New Product"
                            onCta={goCreate}
                        />
                    </div>
                ) : (
                    <div className="bg-[var(--dash-card)] border border-[var(--dash-line)] rounded-[var(--dash-r-card)] shadow-[var(--dash-shadow-card)] overflow-hidden">
                        <div className={`hidden md:grid ${HEAD_COLS} gap-4 items-center px-4 py-3 border-b border-[var(--dash-line)]`}>
                            <span aria-hidden="true" />
                            <SortHeader label="Name" field="name" sort={sort} onSort={handleSort} />
                            <span className="dash-label text-right">Price</span>
                            <span className="dash-label text-right">Stock</span>
                            <SortHeader label="Sold" field="numberSold" sort={sort} onSort={handleSort} align="right" />
                            <SortHeader label="Created" field="createdAt" sort={sort} onSort={handleSort} align="right" />
                            <span aria-hidden="true" />
                        </div>

                        {visibleProducts.length === 0 ? (
                            <p className="px-4 py-8 text-[13px] text-[var(--dash-ink-soft)] text-center">
                                No products match — try another search or view.
                            </p>
                        ) : (
                            <div className="divide-y divide-[var(--dash-line)]">
                                {visibleProducts.map((product) => {
                                    const status = statusOf(product)
                                    const price = product.basePrice?.presentmentAmount
                                    const prefix = currencyPrefix(product.basePrice?.presentmentCurrency)
                                    const created = product.createdAt
                                        ? new Date(product.createdAt).toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' })
                                        : ''
                                    const image = product.images?.[0]
                                    return (
                                        <div
                                            key={product._id}
                                            role="link"
                                            tabIndex={0}
                                            onClick={() => router.push(`/dashboard/products/edit/${product._id}`)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') router.push(`/dashboard/products/edit/${product._id}`)
                                            }}
                                            className={`group dash-hoverable grid ${ROW_COLS} gap-4 items-center w-full text-left px-4 py-2.5 cursor-pointer hover:bg-[var(--dash-canvas)]`}
                                        >
                                            {image ? (
                                                <img
                                                    src={`/api/proxy?key=${encodeURIComponent(image)}`}
                                                    alt=""
                                                    className="h-10 w-10 rounded-[var(--dash-r-inner)] object-cover border border-[var(--dash-line)]"
                                                />
                                            ) : (
                                                <span aria-hidden="true" className="dash-hatch h-10 w-10 rounded-[var(--dash-r-inner)] border border-[var(--dash-line)] inline-block" />
                                            )}
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-[13px] font-medium truncate">{product.name}</span>
                                                <StatusPill tone={status.tone}>{status.label}</StatusPill>
                                            </div>
                                            <span className="dash-data text-right">
                                                <span className="text-[var(--dash-ink-soft)]">{prefix}</span>
                                                {formatMoney(Number(price))}
                                            </span>
                                            <span className="dash-data text-right hidden md:block">{stockDisplay(product)}</span>
                                            <span className="dash-data text-right hidden md:block">{product.numberSold || 0}</span>
                                            <span className="dash-data text-right text-[var(--dash-ink-soft)] hidden md:block">{created}</span>
                                            <span className="hidden md:flex justify-end items-center gap-3">
                                                {product.slug && (
                                                    <Link
                                                        href={`/products/${product.slug}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-[13px] text-[var(--dash-ink-soft)] hover:text-[var(--dash-ink)] opacity-0 group-hover:opacity-100 focus-visible:opacity-100 whitespace-nowrap"
                                                    >
                                                        View in store
                                                    </Link>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setPeekProduct(product) }}
                                                    className="text-[13px] text-[var(--dash-ink-soft)] hover:text-[var(--dash-ink)] opacity-0 group-hover:opacity-100 focus-visible:opacity-100 whitespace-nowrap cursor-pointer"
                                                >
                                                    Performance
                                                </button>
                                                {/* Honest stub (openspec add-listing-manager-extras): no duplicate endpoint yet. */}
                                                <button
                                                    type="button"
                                                    disabled
                                                    title="Needs backend — coming soon"
                                                    className="text-[13px] text-[var(--dash-ink-soft)] opacity-0 group-hover:opacity-40 whitespace-nowrap cursor-not-allowed"
                                                >
                                                    Duplicate
                                                </button>
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Per-product analytics — honest stub (openspec add-creator-product-analytics). */}
                <PeekPanel
                    open={Boolean(peekProduct)}
                    onClose={() => setPeekProduct(null)}
                    title={peekProduct?.name || ''}
                    actions={<ComingSoon />}
                >
                    <EmptyState
                        icon={<IoStatsChartOutline />}
                        title="Product Performance — Coming Soon"
                        body="A per-product table of views, add-to-carts, sales and conversion (plus revenue and referrers) will appear here once creator analytics are wired to PostHog."
                    />
                </PeekPanel>
            </div>
        </DashProvider>
    )
}

export default MyProducts
