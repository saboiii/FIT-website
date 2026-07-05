'use client'
import { useEffect } from 'react'

let locks = 0

/** Locks body scroll while `active` — every Tier-2 overlay uses this (§9.8). */
export default function useScrollLock(active) {
    useEffect(() => {
        if (!active) return undefined
        locks += 1
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            locks -= 1
            if (locks <= 0) document.body.style.overflow = prev
        }
    }, [active])
}
