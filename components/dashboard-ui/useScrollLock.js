'use client'
import { useEffect } from 'react'

let locks = 0
let preLockOverflow = '' // body overflow before the FIRST lock — restored at 0

/** Locks body scroll while `active` — every Tier-2 overlay uses this (§9.8). */
export default function useScrollLock(active) {
    useEffect(() => {
        if (!active) return undefined
        if (locks === 0) preLockOverflow = document.body.style.overflow
        locks += 1
        document.body.style.overflow = 'hidden'
        return () => {
            locks -= 1
            if (locks <= 0) {
                locks = 0
                document.body.style.overflow = preLockOverflow
            }
        }
    }, [active])
}

const escStack = []

/**
 * Esc closes only the TOPMOST open overlay (§4.8 #11). Every overlay with
 * its own Esc handling (Sheet, CommandPalette, CoachMarks) registers here
 * while open; a stacked ConfirmDialog no longer drags the peek behind it
 * down with the same keypress.
 */
export function useEscToClose(active, onClose) {
    useEffect(() => {
        if (!active) return undefined
        const token = {}
        escStack.push(token)
        const onKey = (e) => {
            if (e.key !== 'Escape' || e.defaultPrevented) return
            if (escStack[escStack.length - 1] !== token) return
            e.preventDefault()
            onClose?.()
        }
        window.addEventListener('keydown', onKey)
        return () => {
            const i = escStack.indexOf(token)
            if (i !== -1) escStack.splice(i, 1)
            window.removeEventListener('keydown', onKey)
        }
    }, [active, onClose])
}
