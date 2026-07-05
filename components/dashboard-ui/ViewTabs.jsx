'use client'
import { useEffect, useRef, useState } from 'react'
import { IoChevronBackOutline, IoChevronForwardOutline } from 'react-icons/io5'

/**
 * Saved-view pill tabs over tables (§4.8 #4). Active = the only ink pill.
 * Tabs: [{ key, label, count? }]. Keyboard: native buttons, focus-visible.
 * Every pill is a fixed h-8 (counts never change the height), and the strip
 * scrolls horizontally inside its own box instead of wrapping or pushing
 * siblings. When it overflows, a small nudging chevron cue floats on the
 * clipped edge so the user knows there's more (client polish, 2026-07-05);
 * the cue is decorative (aria-hidden), animates opacity/transform only, and
 * stands still under prefers-reduced-motion.
 */
export default function ViewTabs({ tabs, active, onChange, className = '', ...rest }) {
    const scrollerRef = useRef(null)
    const [overflow, setOverflow] = useState({ left: false, right: false })

    useEffect(() => {
        const el = scrollerRef.current
        if (!el) return undefined
        const update = () => {
            const left = el.scrollLeft > 2
            const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2
            setOverflow((o) => (o.left === left && o.right === right ? o : { left, right }))
        }
        update()
        el.addEventListener('scroll', update, { passive: true })
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null
        ro?.observe(el)
        window.addEventListener('resize', update)
        return () => {
            el.removeEventListener('scroll', update)
            ro?.disconnect()
            window.removeEventListener('resize', update)
        }
    }, [tabs])

    return (
        <div className={`relative min-w-0 ${className}`} {...rest}>
            <div ref={scrollerRef} role="tablist" className="dash-hscroll flex items-center gap-1 flex-nowrap">
                {tabs.map((t) => {
                    const isActive = t.key === active
                    return (
                        <button
                            key={t.key}
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => onChange(t.key)}
                            className={`dash-hoverable inline-flex h-8 shrink-0 items-center whitespace-nowrap leading-none rounded-full px-3.5 text-[13px] font-medium cursor-pointer ${
                                isActive
                                    ? 'bg-[var(--dash-ink)] text-[var(--dash-canvas)]'
                                    : 'text-[var(--dash-ink-soft)] hover:bg-[var(--dash-sun-soft)] hover:text-[var(--dash-ink)]'
                            }`}
                        >
                            {t.label}
                            {Number.isFinite(t.count) && (
                                <span className={`ml-1.5 dash-data ${isActive ? 'text-[rgb(250,249,245,0.7)]' : 'dash-soft'}`}>
                                    {t.count}
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>
            {overflow.right && (
                <span className="dash-scroll-cue right-0" aria-hidden="true">
                    <IoChevronForwardOutline size={11} />
                </span>
            )}
            {overflow.left && (
                <span className="dash-scroll-cue dash-scroll-cue-left left-0" aria-hidden="true">
                    <IoChevronBackOutline size={11} />
                </span>
            )}
        </div>
    )
}
