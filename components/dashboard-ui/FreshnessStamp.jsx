'use client'
import { useEffect, useState } from 'react'

/**
 * "Updated 2 m ago" stamp (§4.8 #18) — the replacement for spinners over
 * populated data (Law C5). Re-renders every 30s.
 */
export default function FreshnessStamp({ at, className = '' }) {
    const [, tick] = useState(0)
    useEffect(() => {
        const t = setInterval(() => tick((n) => n + 1), 30_000)
        return () => clearInterval(t)
    }, [])
    if (!at) return null
    const secs = Math.max(0, (Date.now() - new Date(at).getTime()) / 1000)
    const label =
        secs < 60 ? 'Updated just now' : secs < 3600 ? `Updated ${Math.round(secs / 60)} m ago` : `Updated ${Math.round(secs / 3600)} h ago`
    return <span className={`dash-label ${className}`}>{label}</span>
}
