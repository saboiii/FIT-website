'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Lenis from 'lenis'

// Routes where Lenis must NOT hijack the wheel: the dashboards rely on
// natively scrolling inner containers (sheets, peeks, rails) and Lenis
// scrolls the page behind them instead (dashboard blueprint §9.8).
const NATIVE_SCROLL_PREFIXES = ['/dashboard', '/admin']

export default function Smooth({ children }) {
    const lenisRef = useRef(null)
    const pathname = usePathname()
    const nativeScroll = NATIVE_SCROLL_PREFIXES.some((p) => pathname?.startsWith(p))

    useEffect(() => {
        if (nativeScroll) return undefined
        const lenis = new Lenis()
        lenisRef.current = lenis

        let rafId
        function raf(time) {
            lenis.raf(time)
            rafId = requestAnimationFrame(raf)
        }

        rafId = requestAnimationFrame(raf)

        return () => {
            cancelAnimationFrame(rafId)
            lenis.destroy()
            lenisRef.current = null
        }
    }, [nativeScroll])

    return <>{children}</>
}