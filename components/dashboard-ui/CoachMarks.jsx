'use client'
import { useCallback, useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { settle } from '@/lib/motion/tokens'

/**
 * CoachMarks — per-panel guided tour (blueprint §9.11).
 *
 * `<CoachMarks steps={[{selector, title, body}]} open onClose panelKey />`
 * When open: a 60% ink scrim greys the panel (cast by the spotlight window's
 * huge box-shadow), a sun-ringed cut-out highlights the current step's
 * element, and a paper coach card (Tier-2 shadow) sits beside it with title,
 * body, dot progress and Back/Next/Done. Esc closes. Steps whose selector
 * matches nothing in the DOM are skipped. Reduced motion: instant
 * reposition; otherwise the spotlight/card settle-spring between steps.
 * Closing (Done or Esc) marks `dashTourSeen.<panelKey>` so the auto-offer
 * strip never re-appears.
 */

const SEEN_PREFIX = 'dashTourSeen.'
const SPOT_PAD = 8 // breathing room around the highlighted element
const CARD_W = 320
const CARD_EST_H = 200 // flip-above/below estimate; final position is clamped
const GAP = 12
const EDGE = 8

function markSeen(panelKey) {
    if (!panelKey) return
    try {
        localStorage.setItem(`${SEEN_PREFIX}${panelKey}`, '1')
    } catch { /* private mode etc. — the offer just re-appears */ }
}

/**
 * First-visit auto-offer for a panel's tour, backed by
 * `localStorage.dashTourSeen.<panelKey>`. Both `accept` and `dismiss` mark
 * the tour as seen (dismiss = never offer again); the panel opens the tour
 * itself on accept.
 */
export function useTourOffer(panelKey) {
    const [offered, setOffered] = useState(false)
    useEffect(() => {
        try {
            if (!localStorage.getItem(`${SEEN_PREFIX}${panelKey}`)) setOffered(true)
        } catch { /* ignore */ }
    }, [panelKey])
    const settleOffer = useCallback(() => {
        markSeen(panelKey)
        setOffered(false)
    }, [panelKey])
    return { offered, accept: settleOffer, dismiss: settleOffer }
}

/** Quiet one-line first-visit strip: "New here? Take a 30-second tour". */
export function TourOfferStrip({ onStart, onDismiss, className = '' }) {
    return (
        <div
            className={`flex items-center gap-3 flex-wrap rounded-[var(--dash-r-inner)] border border-[var(--dash-line)] bg-[var(--dash-card)] px-3.5 py-2 text-[13px] ${className}`}
        >
            <span className="dash-soft">New here? Take a 30-second tour of this panel.</span>
            <button
                type="button"
                onClick={onStart}
                className="font-medium text-[var(--dash-ink)] underline underline-offset-2 cursor-pointer"
            >
                Start
            </button>
            <button
                type="button"
                onClick={onDismiss}
                className="dash-soft hover:text-[var(--dash-ink)] cursor-pointer"
            >
                No thanks
            </button>
        </div>
    )
}

/** Quiet `?` icon-button for a panel's GlassBar/header — opens its tour. */
export function TourHelpButton({ onClick, label = 'Take a quick tour of this panel', className = '' }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={label}
            aria-label={label}
            className={`dash-hoverable h-7 w-7 grid place-items-center shrink-0 rounded-full border border-[var(--dash-line)] bg-[var(--dash-card)] text-[13px] font-semibold text-[var(--dash-ink-soft)] hover:text-[var(--dash-ink)] hover:bg-[var(--dash-canvas)] cursor-pointer ${className}`}
        >
            ?
        </button>
    )
}

export default function CoachMarks({ steps = [], open, onClose, panelKey }) {
    const [live, setLive] = useState([]) // steps whose selector resolves right now
    const [index, setIndex] = useState(0)
    const [rect, setRect] = useState(null)
    const reduced = useReducedMotion()

    const finish = useCallback(() => {
        markSeen(panelKey)
        onClose?.()
    }, [panelKey, onClose])

    // Resolve present steps each time the tour opens; missing selectors skip.
    useEffect(() => {
        if (!open) return
        setLive(steps.filter((s) => s.selector && document.querySelector(s.selector)))
        setIndex(0)
        setRect(null)
    }, [open, steps])

    const step = live[index]

    const measure = useCallback(() => {
        if (!step) return
        const el = document.querySelector(step.selector)
        if (!el) return
        const r = el.getBoundingClientRect()
        setRect({
            top: r.top - SPOT_PAD,
            left: r.left - SPOT_PAD,
            width: r.width + SPOT_PAD * 2,
            height: r.height + SPOT_PAD * 2,
        })
    }, [step])

    // Scroll the target into view and track it through scroll/resize.
    useEffect(() => {
        if (!open || !step) return undefined
        const el = document.querySelector(step.selector)
        el?.scrollIntoView?.({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
        measure()
        window.addEventListener('resize', measure)
        window.addEventListener('scroll', measure, true)
        return () => {
            window.removeEventListener('resize', measure)
            window.removeEventListener('scroll', measure, true)
        }
    }, [open, step, measure, reduced])

    // Esc closes (counts as seen).
    useEffect(() => {
        if (!open) return undefined
        const onKey = (e) => {
            if (e.key === 'Escape') finish()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [open, finish])

    if (!open || !step || !rect) return null

    // Coach card beside the spotlight: below when there's room, else above.
    const vw = window.innerWidth
    const vh = window.innerHeight
    const below = rect.top + rect.height + GAP + CARD_EST_H <= vh || rect.top < CARD_EST_H + GAP
    const cardTop = below
        ? Math.max(EDGE, Math.min(rect.top + rect.height + GAP, vh - EDGE - CARD_EST_H))
        : Math.max(EDGE, rect.top - GAP - CARD_EST_H)
    const cardLeft = Math.max(EDGE, Math.min(rect.left, vw - CARD_W - EDGE))
    const spring = reduced ? { duration: 0 } : settle
    const isLast = index === live.length - 1

    return (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Guided tour">
            {/* Spotlight window — transparent cut-out whose box-shadow paints
                the 60% ink scrim over everything else. */}
            <motion.div
                data-coachmarks-spotlight
                className="absolute rounded-[var(--dash-r-inner)] border-4 border-[var(--dash-sun)] pointer-events-none"
                // Size set instantly (layout props are never animated — §4.5);
                // only the transformable x/y glide between steps. The thick sun
                // ring is the sanctioned spotlight marker (§4.1 amendment).
                style={{ boxShadow: '0 0 0 9999px rgb(17 17 17 / 0.6)', top: 0, left: 0, width: rect.width, height: rect.height }}
                initial={false}
                animate={{ x: rect.left, y: rect.top }}
                transition={spring}
            />
            <motion.div
                className="absolute bg-[var(--dash-card)] border border-[var(--dash-line)] rounded-[var(--dash-r-card)] shadow-[var(--dash-shadow-float)] p-4"
                style={{ width: CARD_W, maxWidth: `calc(100vw - ${EDGE * 2}px)`, top: 0, left: 0 }}
                initial={false}
                animate={{ x: cardLeft, y: cardTop }}
                transition={spring}
                role="document"
            >
                <h4 className="dash-section">{step.title}</h4>
                <p className="text-[13px] dash-soft mt-1.5">{step.body}</p>
                <div className="flex items-center justify-between gap-3 mt-4">
                    <div className="flex items-center gap-1.5" aria-label={`Step ${index + 1} of ${live.length}`}>
                        {live.map((s, i) => (
                            <span
                                key={s.selector}
                                aria-hidden="true"
                                className={`h-1.5 w-1.5 rounded-full ${i === index ? 'bg-[var(--dash-ink)]' : 'bg-[var(--dash-line)]'}`}
                            />
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        {index > 0 && (
                            <button
                                type="button"
                                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                                className="dash-hoverable rounded-full px-3 py-1.5 text-[13px] font-medium border border-[var(--dash-line)] bg-[var(--dash-card)] cursor-pointer hover:bg-[var(--dash-canvas)]"
                            >
                                Back
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => (isLast ? finish() : setIndex((i) => i + 1))}
                            className="dash-hoverable rounded-full px-3.5 py-1.5 text-[13px] font-medium bg-[var(--dash-ink)] text-[var(--dash-canvas)] cursor-pointer active:scale-[0.97]"
                        >
                            {isLast ? 'Done' : 'Next'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
