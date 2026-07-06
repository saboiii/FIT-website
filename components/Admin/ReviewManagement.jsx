'use client'
import { useState, useEffect } from 'react';
import { IoSearchOutline, IoStarOutline, IoTrashOutline } from 'react-icons/io5';
import Image from 'next/image';
import { useToast } from '../General/ToastProvider';
import {
    ActionIcon,
    GlassBar,
    StatusPill,
    ConfirmDialog,
    EmptyState,
    SkeletonRow,
    FreshnessStamp,
} from '@/components/dashboard-ui';
import { barSelectCls, rowBtnCls } from './dashPanelUi';

// Rating rendered as ink dots (§5.9) — ●●●●○ — with the value for a11y.
function RatingDots({ value }) {
    const rounded = Math.round(Number(value) || 0);
    return (
        <span className="text-[13px] tracking-[0.1em]" aria-label={`${value} out of 5`}>
            {[1, 2, 3, 4, 5].map(i => (
                <span
                    key={i}
                    aria-hidden="true"
                    className={i <= rounded ? 'text-[var(--dash-ink)]' : 'text-[var(--dash-ink-soft)]'}
                >
                    {i <= rounded ? '●' : '○'}
                </span>
            ))}
        </span>
    );
}

function ReviewManagement() {
    const { showToast } = useToast();
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [filteredReviews, setFilteredReviews] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterRating, setFilterRating] = useState('all');
    const [loading, setLoading] = useState(true);
    const [fetchedAt, setFetchedAt] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null); // { productId, reviewId }

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const response = await fetch('/api/product?all=true');
            if (response.ok) {
                const data = await response.json();
                const productsWithReviews = data.products.filter(p => p.reviews && p.reviews.length > 0);
                setProducts(productsWithReviews);
                setFetchedAt(Date.now());
            }
        } catch (error) {
            console.error('Error fetching products:', error);
            showToast('Failed to load products', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedProduct) {
            setReviews(selectedProduct.reviews || []);
        }
    }, [selectedProduct]);

    useEffect(() => {
        let filtered = [...reviews];

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(review =>
                review.comment?.toLowerCase().includes(query) ||
                review.username?.toLowerCase().includes(query) ||
                review.userId?.toLowerCase().includes(query)
            );
        }

        if (filterRating !== 'all') {
            const rating = parseInt(filterRating);
            filtered = filtered.filter(review => review.rating === rating);
        }

        // Sort by most recent
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        setFilteredReviews(filtered);
    }, [reviews, searchQuery, filterRating]);

    const handleDeleteReview = async (productId, reviewId) => {
        setDeleting(reviewId);
        try {
            const response = await fetch(`/api/review?productId=${productId}&reviewId=${reviewId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // Update local state
                setReviews(prev => prev.filter(review => review._id !== reviewId));

                // Update products list
                setProducts(prev => prev.map(product => {
                    if (product._id === productId) {
                        return {
                            ...product,
                            reviews: product.reviews.filter(r => r._id !== reviewId)
                        };
                    }
                    return product;
                }));

                // Update selected product
                if (selectedProduct?._id === productId) {
                    setSelectedProduct(prev => ({
                        ...prev,
                        reviews: prev.reviews.filter(r => r._id !== reviewId)
                    }));
                }

                showToast('Review deleted successfully', 'success');
            } else {
                const error = await response.json();
                showToast(error.error || 'Failed to delete review', 'error');
            }
        } catch (error) {
            console.error('Error deleting review:', error);
            showToast('Something went wrong', 'error');
        } finally {
            setDeleting(null);
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        const { productId, reviewId } = deleteTarget;
        setDeleteTarget(null);
        await handleDeleteReview(productId, reviewId);
    };

    const calculateAverageRating = (productReviews) => {
        if (productReviews.length === 0) return 0;
        const sum = productReviews.reduce((acc, review) => acc + review.rating, 0);
        return (sum / productReviews.length).toFixed(1);
    };

    if (loading) {
        return (
            <div className="p-4 md:p-6 flex flex-col gap-3" aria-label="Loading reviews">
                {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonRow key={i} />
                ))}
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6">
            {products.length === 0 ? (
                <EmptyState
                    icon={<IoStarOutline />}
                    title="No Reviews Yet"
                    body="Product reviews from customers will appear here as they come in."
                />
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Products list */}
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between px-1">
                            <span className="dash-label">Products</span>
                            <span className="flex items-center gap-2">
                                <span className="dash-data dash-soft">{products.length} with reviews</span>
                                <FreshnessStamp at={fetchedAt} />
                            </span>
                        </div>
                        <div className="flex flex-col gap-1.5 max-h-[600px] overflow-y-auto dash-scroll">
                            {products.map(product => {
                                const avgRating = calculateAverageRating(product.reviews);
                                const isSelected = selectedProduct?._id === product._id;

                                return (
                                    <button
                                        key={product._id}
                                        onClick={() => setSelectedProduct(product)}
                                        aria-pressed={isSelected}
                                        className={`dash-hoverable flex items-center gap-3 p-2.5 rounded-[var(--dash-r-inner)] border text-left cursor-pointer ${
                                            isSelected
                                                ? 'border-[var(--dash-line)] bg-[var(--dash-sun-soft)]'
                                                : 'border-[var(--dash-line)] bg-[var(--dash-card)] hover:bg-[var(--dash-canvas)]'
                                        }`}
                                    >
                                        {product.images && product.images[0] && (
                                            <span className="relative w-10 h-10 rounded-[var(--dash-r-inner)] overflow-hidden border border-[var(--dash-line)] shrink-0">
                                                <Image
                                                    src={product.images[0]}
                                                    alt={product.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            </span>
                                        )}
                                        <span className="flex flex-col flex-1 min-w-0">
                                            <span className="text-[13px] font-medium truncate">{product.name}</span>
                                            <span className="flex items-center gap-1.5">
                                                <RatingDots value={avgRating} />
                                                <span className="dash-data dash-soft">({product.reviews.length})</span>
                                            </span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Reviews pane */}
                    <div className="lg:col-span-2 flex flex-col gap-4">
                        {selectedProduct ? (
                            <>
                                {/* Filters in a slim GlassBar (§5.9) */}
                                <GlassBar className="flex-wrap">
                                    <span className="text-[13px] font-medium truncate">
                                        {selectedProduct.name}
                                    </span>
                                    <label className="flex items-center gap-2 bg-[var(--dash-card)] border border-[var(--dash-line)] rounded-full px-3 py-1.5 flex-1 min-w-[160px]">
                                        <IoSearchOutline size={14} className="shrink-0 text-[var(--dash-ink-soft)]" aria-hidden="true" />
                                        <input
                                            type="text"
                                            placeholder="Search reviews…"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            aria-label="Search reviews"
                                            className="w-full min-w-0 bg-transparent outline-none text-[13px]"
                                        />
                                    </label>
                                    <select
                                        value={filterRating}
                                        onChange={(e) => setFilterRating(e.target.value)}
                                        aria-label="Filter by rating"
                                        className={barSelectCls}
                                    >
                                        <option value="all">All ratings</option>
                                        <option value="5">5 stars</option>
                                        <option value="4">4 stars</option>
                                        <option value="3">3 stars</option>
                                        <option value="2">2 stars</option>
                                        <option value="1">1 star</option>
                                    </select>
                                </GlassBar>

                                {filteredReviews.length === 0 ? (
                                    <EmptyState
                                        icon={<IoStarOutline />}
                                        title="No Matching Reviews"
                                        body="Nothing matches the current search or rating filter."
                                        secondary="Clear filters"
                                        onSecondary={() => { setSearchQuery(''); setFilterRating('all'); }}
                                    />
                                ) : (
                                    <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto dash-scroll">
                                        {filteredReviews.map(review => (
                                            <div
                                                key={review._id}
                                                className="flex flex-col gap-3 p-4 border border-[var(--dash-line)] rounded-[var(--dash-r-inner)] bg-[var(--dash-card)]"
                                            >
                                                {/* Header */}
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        {review.userImageUrl ? (
                                                            <Image
                                                                src={review.userImageUrl}
                                                                alt={review.username}
                                                                width={36}
                                                                height={36}
                                                                className="rounded-full object-cover shrink-0"
                                                            />
                                                        ) : (
                                                            <span className="w-9 h-9 shrink-0 rounded-full bg-[var(--dash-canvas)] border border-[var(--dash-line)] grid place-items-center">
                                                                <span className="text-[13px] font-medium text-[var(--dash-ink-soft)]">
                                                                    {review.username?.[0]?.toUpperCase() || 'U'}
                                                                </span>
                                                            </span>
                                                        )}
                                                        <div className="flex flex-col min-w-0">
                                                            <span className="flex items-center gap-2">
                                                                <span className="text-[13px] font-medium truncate">{review.username}</span>
                                                                {review.verifiedPurchase && (
                                                                    <StatusPill tone="ok">Verified</StatusPill>
                                                                )}
                                                            </span>
                                                            <span className="dash-data dash-soft">
                                                                {new Date(review.createdAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <ActionIcon
                                                        icon={IoTrashOutline}
                                                        tone="bad"
                                                        label="Delete review"
                                                        onClick={() => setDeleteTarget({ productId: selectedProduct._id, reviewId: review._id })}
                                                        disabled={deleting === review._id}
                                                    />
                                                </div>

                                                {/* Rating */}
                                                <RatingDots value={review.rating} />

                                                {/* Comment */}
                                                {review.comment && (
                                                    <p className="text-[13px] leading-relaxed whitespace-pre-wrap">
                                                        {review.comment}
                                                    </p>
                                                )}

                                                {/* Media */}
                                                {review.mediaUrls && review.mediaUrls.length > 0 && (
                                                    <div className="flex gap-2 flex-wrap">
                                                        {review.mediaUrls.map((url, idx) => (
                                                            <span key={idx} className="relative w-20 h-20 rounded-[var(--dash-r-inner)] overflow-hidden border border-[var(--dash-line)]">
                                                                <Image
                                                                    src={url}
                                                                    alt={`Review media ${idx + 1}`}
                                                                    fill
                                                                    className="object-cover"
                                                                />
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Stats */}
                                                <div className="flex items-center gap-4 dash-data dash-soft pt-2 border-t border-[var(--dash-line)]">
                                                    <span>{review.helpful?.length || 0} found helpful</span>
                                                    {review.purchasedVariants && Object.keys(review.purchasedVariants).length > 0 && (
                                                        <span>
                                                            Variant: {Object.entries(review.purchasedVariants)
                                                                .map(([type, option]) => `${option}`)
                                                                .join(', ')}
                                                        </span>
                                                    )}
                                                    {/* Honest stub (blueprint §6 review replies — no openspec change filed yet). */}
                                                    <button
                                                        type="button"
                                                        disabled
                                                        title="Reply to reviews, coming soon"
                                                        className={`${rowBtnCls} ml-auto`}
                                                    >
                                                        Reply
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <EmptyState
                                icon={<IoStarOutline />}
                                title="Select A Product"
                                body="Pick a product on the left to browse and moderate its reviews."
                            />
                        )}
                    </div>
                </div>
            )}

            <ConfirmDialog
                open={Boolean(deleteTarget)}
                onClose={() => setDeleteTarget(null)}
                onConfirm={confirmDelete}
                title="Delete this review?"
                body="The review, its media and helpful votes will be removed. This action cannot be undone."
                confirmLabel="Delete review"
                tone="bad"
            />
        </div>
    );
}

export default ReviewManagement;
