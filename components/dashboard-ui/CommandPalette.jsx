'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { IoSearchOutline } from 'react-icons/io5'
import { sheet, swap } from '@/lib/motion/tokens'
import useScrollLock from './useScrollLock'
import ComingSoon from './ComingSoon'

/**
 * ⌘K command palette (§4.8 #16, §9.1/9.6). Always mounted inside the shell so
 * it owns the global shortcuts: ⌘K/Ctrl+K toggles, `/` opens when no
 * input/textarea/contentEditable is focused, Esc closes. Arrow keys move the
 * sun-soft highlight, Enter commits. Commit and close are INSTANT — keyboard
 * actions never animate (§4.10); only the entrance (scrim opacity + `sheet`
 * panel) is choreographed.
 *
 * @param {{
 *   open: boolean,
 *   onOpen: Function,
 *   onClose: Function,
 *   groups: Array<{key: string, label: string,
 *     items: Array<{id: string, label: string, description?: string,
 *       keywords?: string[], perform: Function}>}>,
 * }} props — `groups` is the command registry; shells extend it by passing
 *   more groups/items (nothing here is hard-coded to a surface).
 */

const RECENTS_KEY = 'dashPaletteRecents'
const MAX_RECENTS = 5

function readRecents() {
    try {
        const raw = JSON.parse(localStorage.getItem(RECENTS_KEY))
        return Array.isArray(raw) ? raw : []
    } catch {
        return []
    }
}

function saveRecent(id) {
    try {
        const next = [id, ...readRecents().filter((x) => x !== id)].slice(0, MAX_RECENTS)
        localStorage.setItem(RECENTS_KEY, JSON.stringify(next))
    } catch { /* private mode etc. — recents are a nicety */ }
}

// Fuzzy-ish: every whitespace-separated token must appear somewhere in the
// label/description/keywords haystack.
function matches(item, query) {
    const hay = `${item.label} ${item.description || ''} ${(item.keywords || []).join(' ')}`.toLowerCase()
    return query
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .every((tok) => hay.includes(tok))
}

export default function CommandPalette({ open, onOpen, onClose, groups = [] }) {
    const [query, setQuery] = useState('')
    const [activeIndex, setActiveIndex] = useState(0)
    const inputRef = useRef(null)
    const listRef = useRef(null)
    useScrollLock(open)

    // Global shortcuts — live for the whole life of the shell.
    useEffect(() => {
        const onKey = (e) => {
            if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
                e.preventDefault()
                if (open) onClose()
                else onOpen()
                return
            }
            if (open) {
                if (e.key === 'Escape') {
                    e.preventDefault()
                    onClose()
                }
                return
            }
            if (e.key === '/') {
                const el = document.activeElement
                const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
                if (!typing) {
                    e.preventDefault()
                    onOpen()
                }
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [open, onOpen, onClose])

    // Fresh sheet each open.
    useEffect(() => {
        if (!open) return
        setQuery('')
        setActiveIndex(0)
        // Focus after the panel exists in the DOM.
        const t = setTimeout(() => inputRef.current?.focus(), 0)
        return () => clearTimeout(t)
    }, [open])

    const allItems = useMemo(() => groups.flatMap((g) => g.items), [groups])

    const visibleGroups = useMemo(() => {
        const q = query.trim()
        if (q) {
            return groups
                .map((g) => ({ ...g, items: g.items.filter((i) => matches(i, q)) }))
                .filter((g) => g.items.length > 0)
        }
        const recents = readRecents()
            .map((id) => allItems.find((i) => i.id === id))
            .filter(Boolean)
        const base = recents.length > 0 ? [{ key: 'recent', label: 'Recent', items: recents }] : []
        return [...base, ...groups]
    }, [groups, allItems, query, open]) // eslint-disable-line react-hooks/exhaustive-deps -- re-read recents each open

    const flatItems = useMemo(
        () => visibleGroups.flatMap((g) => g.items.map((item) => ({ item, group: g.key }))),
        [visibleGroups],
    )
    const clampedIndex = Math.min(activeIndex, Math.max(0, flatItems.length - 1))

    const commit = (item) => {
        if (!item) return
        saveRecent(item.id)
        onClose() // instant — no exit animation on commit (§4.10)
        item.perform()
    }

    const onInputKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIndex((i) => Math.max(i - 1, 0))
        } else if (e.key === 'Enter') {
            e.preventDefault()
            commit(flatItems[clampedIndex]?.item)
        }
    }

    // Keep the highlighted row in view while arrowing.
    useEffect(() => {
        const el = listRef.current?.querySelector('[data-active="true"]')
        el?.scrollIntoView?.({ block: 'nearest' })
    }, [clampedIndex])

    if (!open) return null

    let rowIndex = -1
    return (
        <div
            className="dash fixed inset-0 z-50 flex items-start justify-center px-4 pt-[15vh]"
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
        >
            {/* Scrim: opacity fade only — the blur lives in the class, never animated. */}
            <motion.div
                className="dash-scrim absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={swap}
                onClick={onClose}
            />
            <motion.div
                className="glass-warm relative w-full max-w-xl rounded-[var(--dash-r-card)] overflow-hidden"
                initial={{ y: 16, scale: 0.98, opacity: 0 }}
                animate={{ y: 0, scale: 1, opacity: 1 }}
                transition={sheet}
            >
                <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[var(--dash-line)]">
                    <IoSearchOutline size={16} className="shrink-0 text-[var(--dash-ink-soft)]" aria-hidden />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value)
                            setActiveIndex(0)
                        }}
                        onKeyDown={onInputKeyDown}
                        placeholder="Search or jump to…"
                        aria-label="Search commands"
                        className="flex-1 bg-transparent outline-none text-[14px] text-[var(--dash-ink)]"
                        role="combobox"
                        aria-expanded="true"
                        aria-controls="dash-palette-list"
                    />
                    <kbd className="dash-label rounded-md border border-[var(--dash-line)] bg-[var(--dash-card)] px-1.5 py-0.5">
                        esc
                    </kbd>
                </div>

                <div id="dash-palette-list" ref={listRef} role="listbox" aria-label="Commands" className="dash-scroll max-h-[50vh] py-2">
                    {flatItems.length === 0 && (
                        <>
                            <p className="px-5 py-6 text-[13px] dash-soft">No matches — try a panel name or a setting.</p>
                            {/* Honest stub (blueprint §6 palette entity search — no openspec
                                change filed yet): non-interactive footer, no dead button. */}
                            <div className="flex items-center gap-2 px-5 pb-4 border-t border-[var(--dash-line)] pt-3">
                                <span className="text-[12px] dash-soft">Searching orders &amp; customers</span>
                                <ComingSoon />
                            </div>
                        </>
                    )}
                    {visibleGroups.map((group) => (
                        <div key={group.key} className="px-2 pb-1">
                            <p className="dash-label px-3 pt-2 pb-1">{group.label}</p>
                            {group.items.map((item) => {
                                rowIndex += 1
                                const isActive = rowIndex === clampedIndex
                                const myIndex = rowIndex
                                return (
                                    <button
                                        key={`${group.key}-${item.id}`}
                                        role="option"
                                        aria-selected={isActive}
                                        data-active={isActive || undefined}
                                        onMouseMove={() => setActiveIndex(myIndex)}
                                        onClick={() => commit(item)}
                                        className={`w-full flex items-baseline gap-2 text-left rounded-[var(--dash-r-inner)] px-3 py-2 cursor-pointer ${
                                            isActive ? 'bg-[var(--dash-sun-soft)]' : ''
                                        }`}
                                    >
                                        <span className="text-[14px] font-medium text-[var(--dash-ink)] whitespace-nowrap">
                                            {item.label}
                                        </span>
                                        {item.description && (
                                            <span className="text-[12px] dash-soft truncate">{item.description}</span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                    ))}
                </div>
            </motion.div>
        </div>
    )
}
