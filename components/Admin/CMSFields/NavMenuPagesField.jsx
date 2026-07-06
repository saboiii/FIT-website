'use client'
// CMS editor for the navbar mega-menu "menuPages" list: an ordered set of
// { icon, label, description, href } rows (max 8 by default). Icons come from
// the same curated named set the storefront NavPanel renders (single source
// of truth), picked visually; hrefs must be internal ('/...') or absolute
// http(s) URLs. Drag to reorder, following the ProductSearch pattern.
import { useState } from 'react'
import { FiX } from 'react-icons/fi'
import { MdDragIndicator } from 'react-icons/md'
import { inputCls, labelCls } from '@/components/DashboardComponents/ProductFormFields/dashFormUi'
import { NAV_MENU_ICONS } from '@/components/General/NavPanel'

export const isValidNavHref = (href) => /^\//.test(href || '') || /^https?:\/\//.test(href || '')

export default function NavMenuPagesField({ label, value, onChange, maxItems = 8, helpText }) {
    const items = Array.isArray(value) ? value : []
    const [draggedIndex, setDraggedIndex] = useState(null)

    const updateItem = (index, patch) =>
        onChange(items.map((item, i) => (i === index ? { ...item, ...patch } : item)))
    const removeItem = (index) => onChange(items.filter((_, i) => i !== index))
    const addItem = () =>
        onChange([...items, { icon: 'document', label: '', description: '', href: '/' }])

    const handleDragOver = (e, index) => {
        e.preventDefault()
        if (draggedIndex === null || draggedIndex === index) return
        const updated = [...items]
        const [dragged] = updated.splice(draggedIndex, 1)
        updated.splice(index, 0, dragged)
        setDraggedIndex(index)
        onChange(updated)
    }

    return (
        <div className="flex flex-col gap-3">
            <label className={labelCls}>{label}</label>
            {helpText && <p className="text-[13px] dash-soft">{helpText}</p>}

            <div className="flex flex-col gap-2">
                {items.map((item, index) => (
                    <div
                        key={index}
                        draggable
                        onDragStart={() => setDraggedIndex(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={() => setDraggedIndex(null)}
                        className={`dash-hoverable flex flex-col gap-3 p-3 bg-[var(--dash-canvas)] border border-[var(--dash-line)] rounded-[var(--dash-r-inner)] ${draggedIndex === index ? 'opacity-50' : ''}`}
                    >
                        <div className="flex items-center gap-2">
                            <span className="cursor-move" title="Drag to reorder">
                                <MdDragIndicator className="text-[var(--dash-ink-soft)]" size={20} />
                            </span>
                            <span className="text-[13px] font-medium text-[var(--dash-ink)] flex-1 truncate">
                                {item.label || `Page link ${index + 1}`}
                            </span>
                            <button
                                type="button"
                                onClick={() => removeItem(index)}
                                title="Remove page link"
                                aria-label={`Remove ${item.label || `page link ${index + 1}`}`}
                                className="dash-hoverable shrink-0 p-1.5 hover:bg-[var(--dash-bad-bg)] rounded-full group cursor-pointer"
                            >
                                <FiX className="text-[var(--dash-ink-soft)] group-hover:text-[var(--dash-bad)]" size={16} />
                            </button>
                        </div>

                        {/* Visual icon picker over the curated named set. */}
                        <div className="flex flex-col gap-1.5">
                            <span className="dash-label">Icon</span>
                            <div className="flex flex-wrap gap-1.5">
                                {Object.entries(NAV_MENU_ICONS).map(([name, Icon]) => {
                                    const selected = item.icon === name
                                    return (
                                        <button
                                            key={name}
                                            type="button"
                                            title={name}
                                            aria-label={`${name} icon`}
                                            aria-pressed={selected}
                                            onClick={() => updateItem(index, { icon: name })}
                                            className={`dash-hoverable grid h-9 w-9 place-items-center rounded-[var(--dash-r-inner)] border border-[var(--dash-line)] cursor-pointer ${selected
                                                ? 'bg-[var(--dash-sun-soft)] text-[var(--dash-ink)]'
                                                : 'bg-[var(--dash-card)] text-[var(--dash-ink-soft)] hover:bg-[var(--dash-canvas)]'
                                                }`}
                                        >
                                            <Icon size={18} aria-hidden="true" />
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <span className="dash-label">Label</span>
                                <input
                                    type="text"
                                    value={item.label || ''}
                                    onChange={(e) => updateItem(index, { label: e.target.value })}
                                    placeholder="e.g. Blog"
                                    className={inputCls()}
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <span className="dash-label">Link</span>
                                <input
                                    type="text"
                                    value={item.href || ''}
                                    onChange={(e) => updateItem(index, { href: e.target.value })}
                                    placeholder="/blog"
                                    className={inputCls(!isValidNavHref(item.href))}
                                />
                                {!isValidNavHref(item.href) && (
                                    <p className="text-[12px] text-[var(--dash-bad)]">
                                        Link must start with / or http(s)://
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <span className="dash-label">Description</span>
                            <input
                                type="text"
                                value={item.description || ''}
                                onChange={(e) => updateItem(index, { description: e.target.value })}
                                placeholder="One short line shown under the label"
                                className={inputCls()}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <button
                type="button"
                onClick={addItem}
                disabled={items.length >= maxItems}
                className="dash-hoverable self-start rounded-full border border-[var(--dash-line)] bg-[var(--dash-card)] px-3.5 py-1.5 text-[13px] font-medium text-[var(--dash-ink)] cursor-pointer hover:bg-[var(--dash-canvas)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Add page link
            </button>
            {items.length >= maxItems && (
                <p className="text-[13px] dash-soft">Maximum of {maxItems} page links.</p>
            )}
        </div>
    )
}
