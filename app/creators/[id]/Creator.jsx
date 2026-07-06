'use client'
// Public creator SHOP page — banner + overlapping round logo + verified chip
// + link chips + stat strip + featured/all product grids (reference:
// docs/dashboard-ui-reference-images/shop-page-editing.png, rendered in the
// storefront vocabulary). Every capability of the previous page is kept:
// display-name sanitising, the Message-creator chat event, the products grid
// with ProductCard, and the empty state.
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { useUser } from '@clerk/nextjs';
import { GoCheckCircleFill, GoLinkExternal, GoPencil } from "react-icons/go";

const isLikelyClerkUserId = (value) => typeof value === 'string' && /^user_[a-zA-Z0-9]+$/.test(value);

const sanitizeDisplayName = (value, fallback = 'Unnamed Store') => {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    if (isLikelyClerkUserId(trimmed)) return fallback;
    return trimmed;
};

const proxySrc = (key) => `/api/proxy?key=${encodeURIComponent(key)}`;

const averageRating = (products) => {
    let sum = 0;
    let count = 0;
    for (const p of products) {
        for (const r of p?.reviews || []) {
            const rating = Number(r?.rating);
            if (Number.isFinite(rating)) {
                sum += rating;
                count += 1;
            }
        }
    }
    if (count === 0) return null;
    return Math.round((sum / count) * 10) / 10;
};

function Stat({ value, label }) {
    return (
        <div className="flex flex-col items-center gap-1 py-4">
            <span className="text-2xl md:text-3xl font-semibold tracking-tight text-textColor">{value}</span>
            <span className="text-xs text-lightColor">{label}</span>
        </div>
    );
}

function Creator({ creator, products }) {
    const { user, isLoaded } = useUser();
    const displayName = sanitizeDisplayName(creator?.displayName, 'Unnamed Store');
    const viewerUserId = isLoaded ? (user?.id ? String(user.id) : null) : null;
    const creatorUserId = creator?.id ? String(creator.id) : null;
    const isSelf = !!(viewerUserId && creatorUserId && viewerUserId === creatorUserId);
    const canMessageCreator = !!(viewerUserId && creatorUserId && !isSelf);

    const shop = creator?.shop || {};
    const safeProducts = Array.isArray(products) ? products : [];
    // Verified chip: role "Creator" is only ever set for subscribed (or admin)
    // accounts via the display-name flow, so it is a safe derivable signal.
    const isVerified = creator?.role === 'Creator';
    const accent = shop.accentColor || '';

    const links = Array.isArray(shop.links) ? shop.links.slice(0, 6) : [];
    const featuredIds = Array.isArray(shop.featuredProductIds) ? shop.featuredProductIds : [];
    const productById = new Map(safeProducts.map((p) => [String(p._id || p.id), p]));
    const featuredProducts = featuredIds
        .map((id) => productById.get(String(id)))
        .filter(Boolean);

    const totalLikes = safeProducts.reduce((acc, p) => acc + (p?.likes?.length || 0), 0);
    const avgRating = averageRating(safeProducts);

    const messageCreator = () => {
        if (typeof window === 'undefined') return;
        if (isSelf) return;
        window.dispatchEvent(
            new CustomEvent('fit:openCreatorChat', {
                detail: {
                    targetUserId: creator?.id,
                    displayName: sanitizeDisplayName(creator?.displayName, 'Unnamed Store'),
                    imageUrl: creator?.imageUrl || null,
                },
            })
        );
    }

    return (
        <div className="flex flex-col min-h-[92vh] w-full items-center justify-start border-b border-borderColor py-16 px-4 md:px-8">
            <div className="flex flex-col w-full max-w-6xl gap-8">
                {/* Banner + overlapping logo */}
                <div className="flex flex-col">
                    <div className="relative w-full h-40 md:h-56 rounded-md overflow-hidden border border-borderColor bg-baseColor">
                        {shop.bannerImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={proxySrc(shop.bannerImage)}
                                alt={`${displayName} banner`}
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                        ) : (
                            <div
                                data-testid="banner-fallback"
                                aria-hidden="true"
                                className="absolute inset-0 bg-baseColor"
                                style={accent ? { backgroundColor: `${accent}14` } : undefined}
                            />
                        )}
                        {isSelf && (
                            <Link
                                href="/dashboard/shop"
                                className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full border border-borderColor bg-background/90 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-textColor hover:bg-background transition-colors duration-300"
                            >
                                <GoPencil aria-hidden="true" />
                                Edit shop
                            </Link>
                        )}
                    </div>

                    <div className="flex flex-col md:flex-row md:items-end gap-4 px-4 md:px-6 -mt-10">
                        <div
                            className="shrink-0 h-20 w-20 md:h-24 md:w-24 rounded-full border border-borderColor bg-background overflow-hidden flex items-center justify-center"
                            data-testid="shop-logo"
                        >
                            {shop.logoImage ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={proxySrc(shop.logoImage)}
                                    alt={`${displayName} logo`}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-3xl md:text-4xl font-semibold text-lightColor select-none">
                                    {displayName.charAt(0).toUpperCase()}
                                </span>
                            )}
                        </div>

                        <div className="flex flex-col gap-1 pb-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-left leading-tight">{displayName}</h1>
                                {isVerified && (
                                    <span className="flex items-center gap-1 rounded-full border border-borderColor bg-baseColor px-2.5 py-1 text-xs font-medium text-lightColor whitespace-nowrap">
                                        <GoCheckCircleFill aria-hidden="true" style={accent ? { color: accent } : undefined} className={accent ? undefined : 'text-textColor'} />
                                        Verified creator
                                    </span>
                                )}
                            </div>
                            {shop.description ? (
                                <p className="text-sm text-lightColor max-w-2xl whitespace-pre-line">{shop.description}</p>
                            ) : (
                                <p className="text-sm text-lightColor">Creator on Fix It Today®</p>
                            )}
                        </div>

                        {canMessageCreator && (
                            <div className="pb-1 shrink-0">
                                <button
                                    type="button"
                                    className="formBlackButton"
                                    onClick={messageCreator}
                                >
                                    Message creator
                                </button>
                            </div>
                        )}
                    </div>

                    {links.length > 0 && (
                        <div className="flex flex-row flex-wrap gap-2 px-4 md:px-6 mt-4">
                            {links.map((link, i) => (
                                <a
                                    key={`${link.url}-${i}`}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 rounded-full border border-borderColor bg-background px-3 py-1.5 text-xs font-medium text-lightColor hover:text-textColor hover:bg-baseColor transition-colors duration-300"
                                >
                                    {link.label}
                                    <GoLinkExternal aria-hidden="true" className="text-extraLight" />
                                </a>
                            ))}
                        </div>
                    )}
                </div>

                {/* Stat strip */}
                <div
                    data-testid="stat-strip"
                    className="grid grid-cols-2 md:grid-cols-4 border border-borderColor rounded-md bg-background divide-x divide-y md:divide-y-0 divide-borderColor"
                >
                    <Stat value={safeProducts.length} label={safeProducts.length === 1 ? 'Product' : 'Products'} />
                    <Stat value={totalLikes} label="Likes" />
                    <Stat value={avgRating != null ? avgRating.toFixed(1) : '—'} label="Avg rating" />
                    <Stat value={creator?.joinedYear || '—'} label="Joined" />
                </div>

                {/* Featured products (creator-curated, click order) */}
                {featuredProducts.length > 0 && (
                    <div className="flex flex-col gap-4">
                        <h2 className="font-semibold text-textColor">Featured</h2>
                        <div className="grid w-full lg:grid-cols-4 md:grid-cols-2 grid-cols-1 gap-6">
                            {featuredProducts.map((p) => (
                                <ProductCard key={`featured-${p._id || p.id}`} product={p} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Full product grid */}
                <div className="flex flex-col gap-4">
                    <h2 className="font-semibold text-textColor">Products</h2>
                    {safeProducts.length > 0 ? (
                        <div className="grid w-full lg:grid-cols-4 md:grid-cols-2 grid-cols-1 gap-6">
                            {safeProducts.map((p) => (
                                <ProductCard key={p._id || p.id} product={p} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex w-full items-center justify-center border border-borderColor rounded-sm py-16 bg-white">
                            <div className="text-sm text-lightColor">No products found.</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Creator;
