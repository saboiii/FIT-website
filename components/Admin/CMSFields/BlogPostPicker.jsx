'use client'
// CMS picker for the navbar's featured blog articles: search the published
// posts (admin lean list, fetched once on first focus) and keep an ordered
// { slug, title } list (max 4 by default), drag to reorder. Mirrors the
// ProductSearch field's search-plus-selected-list pattern.
import { useEffect, useRef, useState } from 'react'
import { FiSearch, FiX } from 'react-icons/fi'
import { MdDragIndicator } from 'react-icons/md'
import { inputCls, labelCls } from '@/components/DashboardComponents/ProductFormFields/dashFormUi'

export default function BlogPostPicker({ label, value, onChange, maxItems = 4, helpText }) {
    const selected = Array.isArray(value) ? value : []
    const [query, setQuery] = useState('')
    const [posts, setPosts] = useState(null) // null = not fetched yet
    const [showDropdown, setShowDropdown] = useState(false)
    const [draggedIndex, setDraggedIndex] = useState(null)
    const boxRef = useRef(null)

    const loadPosts = async () => {
        if (posts !== null) return
        try {
            const res = await fetch('/api/admin/blog?all=1&status=published')
            const data = res.ok ? await res.json() : {}
            setPosts((data.posts || []).map((p) => ({ slug: p.slug, title: p.title })))
        } catch {
            setPosts([])
        }
    }

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (boxRef.current && !boxRef.current.contains(event.target)) setShowDropdown(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const addPost = (post) => {
        if (!selected.find((p) => p.slug === post.slug)) {
            onChange([...selected, { slug: post.slug, title: post.title }])
        }
        setQuery('')
        setShowDropdown(false)
    }
    const removePost = (slug) => onChange(selected.filter((p) => p.slug !== slug))

    const handleDragOver = (e, index) => {
        e.preventDefault()
        if (draggedIndex === null || draggedIndex === index) return
        const updated = [...selected]
        const [dragged] = updated.splice(draggedIndex, 1)
        updated.splice(index, 0, dragged)
        setDraggedIndex(index)
        onChange(updated)
    }

    const atMax = selected.length >= maxItems
    const results = (posts || [])
        .filter(
            (p) =>
                p.title?.toLowerCase().includes(query.trim().toLowerCase()) &&
                !selected.find((s) => s.slug === p.slug),
        )
        .slice(0, 10)

    return (
        <div className="flex flex-col gap-3">
            <label className={labelCls}>{label}</label>
            {helpText && <p className="text-[13px] dash-soft">{helpText}</p>}

            <div className="relative" ref={boxRef}>
                <div className="relative">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value)
                            setShowDropdown(true)
                        }}
                        onFocus={() => {
                            setShowDropdown(true)
                            loadPosts()
                        }}
                        placeholder={atMax ? `Maximum of ${maxItems} articles selected` : 'Search published posts by title...'}
                        disabled={atMax}
                        className={`${inputCls()} pr-10 disabled:opacity-50`}
                    />
                    <FiSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--dash-ink-soft)]" size={18} />
                </div>

                {showDropdown && !atMax && (
                    <div className="absolute z-50 w-full mt-1 bg-[var(--dash-card)] border border-[var(--dash-line)] rounded-[var(--dash-r-inner)] shadow-[var(--dash-shadow-float)] max-h-64 overflow-y-auto">
                        {posts === null ? (
                            <div className="p-4 text-center text-[13px] dash-soft">Loading posts...</div>
                        ) : results.length > 0 ? (
                            <div className="py-1">
                                {results.map((post) => (
                                    <button
                                        key={post.slug}
                                        type="button"
                                        onClick={() => addPost(post)}
                                        className="dash-hoverable w-full px-4 py-2 text-left hover:bg-[var(--dash-canvas)] cursor-pointer"
                                    >
                                        <div className="text-[13px] font-medium text-[var(--dash-ink)] truncate">{post.title}</div>
                                        <div className="text-[13px] dash-soft truncate">/blog/{post.slug}</div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 text-center text-[13px] dash-soft">No published posts found</div>
                        )}
                    </div>
                )}
            </div>

            {selected.length > 0 && (
                <div className="flex flex-col gap-2">
                    <div className="dash-label">
                        Selected articles ({selected.length} of {maxItems}), drag to reorder
                    </div>
                    <div className="flex flex-col gap-2">
                        {selected.map((post, index) => (
                            <div
                                key={post.slug}
                                draggable
                                onDragStart={() => setDraggedIndex(index)}
                                onDragOver={(e) => handleDragOver(e, index)}
                                onDragEnd={() => setDraggedIndex(null)}
                                className={`dash-hoverable flex items-center gap-3 p-3 bg-[var(--dash-canvas)] border border-[var(--dash-line)] rounded-[var(--dash-r-inner)] cursor-move ${draggedIndex === index ? 'opacity-50' : ''}`}
                            >
                                <MdDragIndicator className="text-[var(--dash-ink-soft)] shrink-0" size={20} />
                                <div className="flex-1 min-w-0">
                                    <div className="text-[13px] font-medium text-[var(--dash-ink)] truncate">{post.title}</div>
                                    <div className="text-[13px] dash-soft truncate">/blog/{post.slug}</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removePost(post.slug)}
                                    title="Remove article"
                                    aria-label={`Remove ${post.title}`}
                                    className="dash-hoverable shrink-0 p-1.5 hover:bg-[var(--dash-bad-bg)] rounded-full group cursor-pointer"
                                >
                                    <FiX className="text-[var(--dash-ink-soft)] group-hover:text-[var(--dash-bad)]" size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
