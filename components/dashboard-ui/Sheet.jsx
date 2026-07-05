'use client'
import { AnimatePresence, motion } from 'framer-motion'
import { sheet, swap, swapExit } from '@/lib/motion/tokens'
import useScrollLock, { useEscToClose } from './useScrollLock'

/**
 * Tier-2 modal sheet (§4.8 #11): warm-glass scrim that fades in and blurs
 * everything behind, panel arrives with the `sheet` spring. Esc/scrim close.
 * `side="center"` (default) or `"right"` (slide-over base for PeekPanel).
 */
export default function Sheet({ open, onClose, side = 'center', label, widthClass, children }) {
    useScrollLock(open)
    useEscToClose(open, onClose)

    const panelMotion =
        side === 'right'
            ? { initial: { x: 48, opacity: 0 }, animate: { x: 0, opacity: 1 }, exit: { x: 24, opacity: 0, transition: swapExit } }
            : { initial: { y: 24, scale: 0.98, opacity: 0 }, animate: { y: 0, scale: 1, opacity: 1 }, exit: { y: 12, opacity: 0, transition: swapExit } }

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    // No `dash` class here: overlays always mount inside a .dash
                    // tree (tokens inherit), and .dash paints an OPAQUE canvas
                    // background that would black out the page behind the scrim.
                    className={`fixed inset-0 z-50 flex ${side === 'right' ? 'justify-end' : 'items-center justify-center p-4'}`}
                    role="dialog"
                    aria-modal="true"
                    aria-label={label}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: swapExit }}
                    transition={swap}
                >
                    <div className="dash-scrim absolute inset-0" onClick={onClose} />
                    <motion.div
                        {...panelMotion}
                        transition={sheet}
                        className={`glass-warm relative dash-scroll max-h-full ${
                            side === 'right'
                                ? `h-full w-full ${widthClass || 'max-w-[480px]'} rounded-l-[var(--dash-r-card)]`
                                : `w-full ${widthClass || 'max-w-lg'} rounded-[var(--dash-r-card)]`
                        }`}
                    >
                        {children}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
