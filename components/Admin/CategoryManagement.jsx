'use client'
import { useState, useEffect } from 'react'
import { useToast } from '@/components/General/ToastProvider'
import { IoAddOutline, IoChevronDown, IoChevronForward, IoTrashOutline, IoPricetagsOutline } from 'react-icons/io5'
import {
    ActionIcon,
    DashCard,
    StatusPill,
    Tag,
    ViewTabs,
    Sheet,
    ConfirmDialog,
    EmptyState,
    SkeletonRow,
} from '@/components/dashboard-ui'
import { inputCls, labelCls, DashSelect, quietBtnCls } from '@/components/DashboardComponents/ProductFormFields/dashFormUi'
import { sunBtnCls, inkBtnCls, rowBtnCls } from './dashPanelUi'

/**
 * Categories (§5.10): tree rows where each trailing element has ONE visual
 * role — scope (shop/print) is a flat muted tag, state (Active/Inactive) is a
 * StatusPill, and the toggle is an obvious bordered pill button. Slugs render
 * in the monospaced data style. Built-ins are hatch-protected. New category /
 * subcategory share ONE Sheet with a type toggle. API payloads are unchanged.
 */

// Monospaced slug (the URL variant of the display name, e.g. power-tools).
const slugCls = 'font-mono text-[12px] font-medium dash-soft truncate'

export default function CategoryManagement() {
    const [categories, setCategories] = useState([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [expandedCategories, setExpandedCategories] = useState({})
    const [sheetOpen, setSheetOpen] = useState(false)
    const [sheetKind, setSheetKind] = useState('category') // 'category' | 'subcategory'
    const [deleteTarget, setDeleteTarget] = useState(null) // { kind, name, parentName?, label }
    const [deleteBusy, setDeleteBusy] = useState(false)
    const { showToast } = useToast()

    const [formData, setFormData] = useState({
        name: '',
        displayName: '',
        type: 'shop',
        isActive: true
    })

    const [subForm, setSubForm] = useState({
        parentName: '',
        name: '',
        displayName: '',
        isActive: true
    })

    const toggleCategory = (categoryName) => {
        setExpandedCategories(prev => ({
            ...prev,
            [categoryName]: !prev[categoryName]
        }))
    }

    useEffect(() => {
        fetchCategories()
    }, [])

    const fetchCategories = async () => {
        try {
            const response = await fetch('/api/admin/settings')
            const data = await response.json()
            if (response.ok) {
                setCategories(data.categories || [])
            } else {
                showToast('Failed to fetch categories', 'error')
            }
        } catch (error) {
            showToast('Error: ' + error.message, 'error')
        } finally {
            setLoading(false)
        }
    }

    const openSheet = (kind) => {
        setSheetKind(kind)
        setSheetOpen(true)
    }

    const closeSheet = () => {
        setSheetOpen(false)
        setFormData({ name: '', displayName: '', type: 'shop', isActive: true })
        setSubForm({ parentName: '', name: '', displayName: '', isActive: true })
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!formData.name || !formData.displayName) {
            showToast('Please fill in all required fields', 'error')
            return
        }

        setSaving(true)
        try {
            const response = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'category',
                    action: 'add',
                    data: formData
                })
            })

            const result = await response.json()
            if (response.ok) {
                showToast('Category added!', 'success')
                closeSheet()
                fetchCategories()
            } else {
                showToast(result.error || 'Failed to add', 'error')
            }
        } catch (error) {
            showToast('Error: ' + error.message, 'error')
        } finally {
            setSaving(false)
        }
    }

    const handleSubSubmit = async (e) => {
        e.preventDefault()
        if (!subForm.parentName || !subForm.name || !subForm.displayName) {
            showToast('Please fill in all required fields', 'error')
            return
        }

        setSaving(true)
        try {
            const response = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'subcategory',
                    action: 'add',
                    data: subForm
                })
            })

            const result = await response.json()
            if (response.ok) {
                showToast('Subcategory added!', 'success')
                closeSheet()
                fetchCategories()
            } else {
                showToast(result.error || 'Failed to add subcategory', 'error')
            }
        } catch (error) {
            showToast('Error: ' + error.message, 'error')
        } finally {
            setSaving(false)
        }
    }

    const confirmDelete = async () => {
        if (!deleteTarget) return
        setDeleteBusy(true)
        try {
            const body = deleteTarget.kind === 'subcategory'
                ? { type: 'subcategory', parentName: deleteTarget.parentName, name: deleteTarget.name }
                : { type: 'category', name: deleteTarget.name }
            const response = await fetch('/api/admin/settings', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            if (response.ok) {
                showToast(deleteTarget.kind === 'subcategory' ? 'Subcategory deleted!' : 'Deleted!', 'success')
                setDeleteTarget(null)
                fetchCategories()
            } else {
                showToast('Failed to delete', 'error')
            }
        } catch (error) {
            showToast('Error: ' + error.message, 'error')
        } finally {
            setDeleteBusy(false)
        }
    }

    const handleToggleActive = async (name, isActive) => {
        try {
            const response = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'category',
                    action: 'toggleActive',
                    name,
                    isActive: !isActive
                })
            })

            if (response.ok) {
                showToast('Updated!', 'success')
                fetchCategories()
            } else {
                showToast('Failed to update', 'error')
            }
        } catch (error) {
            showToast('Error: ' + error.message, 'error')
        }
    }

    const handleToggleSubActive = async (parentName, name, isActive) => {
        try {
            const response = await fetch('/api/admin/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'subcategory',
                    action: 'toggleActive',
                    parentName,
                    name,
                    isActive: !isActive
                })
            })

            if (response.ok) {
                showToast('Updated!', 'success')
                fetchCategories()
            } else {
                showToast('Failed to update', 'error')
            }
        } catch (error) {
            showToast('Error: ' + error.message, 'error')
        }
    }

    const activePill = (isActive) => (
        isActive ? <StatusPill tone="paper">Active</StatusPill> : <StatusPill tone="bad">Inactive</StatusPill>
    )

    const toggleBtn = (isActive, onClick) => (
        <button type="button" onClick={onClick} className={rowBtnCls}>
            {isActive ? 'Deactivate' : 'Activate'}
        </button>
    )

    const deleteBtn = (target) => (
        <ActionIcon
            icon={IoTrashOutline}
            tone="bad"
            label={`Delete ${target.label}`}
            onClick={() => setDeleteTarget(target)}
        />
    )

    if (loading) {
        return (
            <div className="p-4 md:p-6 flex flex-col gap-3" aria-label="Loading categories">
                {Array.from({ length: 5 }).map((_, i) => (
                    <SkeletonRow key={i} />
                ))}
            </div>
        )
    }

    return (
        <div className="p-4 md:p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <p className="text-[13px] dash-soft max-w-md">
                    Organise products with Shop and Print categories and their
                    subcategories. Built-ins are protected.
                </p>
                {categories.length > 0 && (
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => openSheet('subcategory')}
                            className={`${quietBtnCls} flex items-center gap-1`}
                        >
                            <IoAddOutline size={16} aria-hidden="true" /> New subcategory
                        </button>
                        <button
                            type="button"
                            onClick={() => openSheet('category')}
                            className={`${sunBtnCls} flex items-center gap-1`}
                        >
                            <IoAddOutline size={16} aria-hidden="true" /> New category
                        </button>
                    </div>
                )}
            </div>

            {categories.length === 0 ? (
                <EmptyState
                    icon={<IoPricetagsOutline />}
                    title="No Categories Yet"
                    body="Categories organise the shop and print storefronts. Create the first one."
                    cta="Create Category"
                    onCta={() => openSheet('category')}
                />
            ) : (
                <DashCard>
                    <div className="divide-y divide-[var(--dash-line)]">
                        {categories.map((cat, idx) => {
                            const hasSubs = cat.subcategories && cat.subcategories.length > 0
                            const expanded = expandedCategories[cat.name]
                            return (
                                <div key={cat.name || idx}>
                                    <div className="flex items-center gap-3 py-2.5">
                                        {hasSubs ? (
                                            <ActionIcon
                                                icon={expanded ? IoChevronDown : IoChevronForward}
                                                label={expanded ? 'Collapse' : 'Expand'}
                                                onClick={() => toggleCategory(cat.name)}
                                                aria-expanded={Boolean(expanded)}
                                            />
                                        ) : (
                                            <span className="h-7 w-7 shrink-0" aria-hidden="true" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-[13px] font-medium truncate">{cat.displayName}</span>
                                                <span className={slugCls}>{cat.name}</span>
                                            </div>
                                            {hasSubs && (
                                                <p className="dash-data dash-soft">
                                                    {cat.subcategories.length} subcategor{cat.subcategories.length !== 1 ? 'ies' : 'y'}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                                            <Tag>{cat.type}</Tag>
                                            {cat.isHardcoded && <StatusPill tone="hatch">Built-in</StatusPill>}
                                            {activePill(cat.isActive)}
                                            {toggleBtn(cat.isActive, () => handleToggleActive(cat.name, cat.isActive))}
                                            {!cat.isHardcoded && deleteBtn({ kind: 'category', name: cat.name, label: cat.displayName })}
                                        </div>
                                    </div>
                                    {hasSubs && expanded && (
                                        <div className="pb-2.5">
                                            {cat.subcategories.map((sub, sidx) => (
                                                <div
                                                    key={sub.name || sidx}
                                                    className="flex items-center gap-3 py-2 pl-10 border-t border-[var(--dash-line)]"
                                                >
                                                    <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                                                        <span className="text-[13px] truncate">{sub.displayName}</span>
                                                        <span className={slugCls}>{sub.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        {activePill(sub.isActive)}
                                                        {toggleBtn(sub.isActive, () => handleToggleSubActive(cat.name, sub.name, sub.isActive))}
                                                        {!sub.isHardcoded && deleteBtn({ kind: 'subcategory', parentName: cat.name, name: sub.name, label: sub.displayName })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </DashCard>
            )}

            {/* ONE Sheet for both create flows, switched by the type toggle */}
            <Sheet open={sheetOpen} onClose={closeSheet} label="New category or subcategory" widthClass="max-w-xl">
                <div className="p-6 flex flex-col gap-4">
                    <h3 className="dash-section">Add to the catalogue</h3>
                    <ViewTabs
                        tabs={[
                            { key: 'category', label: 'Category' },
                            { key: 'subcategory', label: 'Subcategory' },
                        ]}
                        active={sheetKind}
                        onChange={setSheetKind}
                    />

                    {sheetKind === 'category' ? (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="catUrlName" className={labelCls}>URL name *</label>
                                    <input
                                        id="catUrlName"
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                                        className={inputCls()}
                                        placeholder="electronics"
                                        required
                                    />
                                    <p className="text-[11px] font-medium dash-soft">Lowercase, no spaces</p>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="catDisplayName" className={labelCls}>Display name *</label>
                                    <input
                                        id="catDisplayName"
                                        type="text"
                                        value={formData.displayName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                                        className={inputCls()}
                                        placeholder="Electronics"
                                        required
                                    />
                                    <p className="text-[11px] font-medium dash-soft">Shown to users</p>
                                </div>
                            </div>
                            <DashSelect
                                label="Type"
                                name="categoryType"
                                value={formData.type}
                                onChangeFunction={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                                options={[
                                    { value: 'shop', label: 'Shop' },
                                    { value: 'print', label: 'Print' },
                                ]}
                            />
                            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--dash-line)]">
                                <button type="button" onClick={closeSheet} disabled={saving} className={quietBtnCls}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className={inkBtnCls}>
                                    {saving ? 'Adding…' : 'Add category'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleSubSubmit} className="flex flex-col gap-4">
                            <DashSelect
                                label="Parent category"
                                name="parentName"
                                value={subForm.parentName}
                                onChangeFunction={(e) => setSubForm(prev => ({ ...prev, parentName: e.target.value }))}
                                options={[
                                    { value: '', label: 'Select parent' },
                                    ...categories.map(cat => ({ value: cat.name, label: cat.displayName })),
                                ]}
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="subUrlName" className={labelCls}>URL name *</label>
                                    <input
                                        id="subUrlName"
                                        type="text"
                                        value={subForm.name}
                                        onChange={(e) => setSubForm(prev => ({ ...prev, name: e.target.value.toLowerCase().replace(/\s+/g, '-') }))}
                                        className={inputCls()}
                                        placeholder="popular"
                                        required
                                    />
                                    <p className="text-[11px] font-medium dash-soft">Lowercase, no spaces</p>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label htmlFor="subDisplayName" className={labelCls}>Display name *</label>
                                    <input
                                        id="subDisplayName"
                                        type="text"
                                        value={subForm.displayName}
                                        onChange={(e) => setSubForm(prev => ({ ...prev, displayName: e.target.value }))}
                                        className={inputCls()}
                                        placeholder="Popular"
                                        required
                                    />
                                    <p className="text-[11px] font-medium dash-soft">Shown to users</p>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--dash-line)]">
                                <button type="button" onClick={closeSheet} disabled={saving} className={quietBtnCls}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className={inkBtnCls}>
                                    {saving ? 'Adding…' : 'Add subcategory'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </Sheet>

            <ConfirmDialog
                open={Boolean(deleteTarget)}
                onClose={() => setDeleteTarget(null)}
                onConfirm={confirmDelete}
                title={deleteTarget?.kind === 'subcategory' ? 'Delete this subcategory?' : 'Delete this category?'}
                body={deleteTarget ? `"${deleteTarget.label}" will be removed from the catalogue. This action cannot be undone.` : ''}
                confirmLabel={deleteTarget?.kind === 'subcategory' ? 'Delete subcategory' : 'Delete category'}
                tone="bad"
                busy={deleteBusy}
            />
        </div>
    )
}
