'use client'
// Notification centre — honest stub (openspec add-dashboard-notification-centre).
// The bell button is LIVE (it opens the popover); the popover content is the
// stub: an informational empty state behind a ComingSoon pill. No fake counts,
// no fake dot — nothing pretends there are notifications.
import { useEffect, useRef, useState } from 'react'
import { IoNotificationsOutline } from 'react-icons/io5'
import { ComingSoon, EmptyState } from '@/components/dashboard-ui'

export default function NotificationsBell({ align = 'left', className = '' }) {
    const [open, setOpen] = useState(false)
    const rootRef = useRef(null)

    // Close on Escape and on any pointer-down outside the bell/popover.
    useEffect(() => {
        if (!open) return undefined
        const onKey = (e) => e.key === 'Escape' && setOpen(false)
        const onPointer = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
        }
        window.addEventListener('keydown', onKey)
        document.addEventListener('mousedown', onPointer)
        return () => {
            window.removeEventListener('keydown', onKey)
            document.removeEventListener('mousedown', onPointer)
        }
    }, [open])

    return (
        <div ref={rootRef} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-label="Notifications"
                aria-expanded={open}
                title="Notifications"
                className="dash-hoverable h-8 w-8 grid place-items-center rounded-full border border-[var(--dash-line)] bg-[var(--dash-card)] text-[var(--dash-ink-soft)] cursor-pointer hover:text-[var(--dash-ink)] hover:bg-[var(--dash-sun-soft)]"
            >
                <IoNotificationsOutline size={15} aria-hidden="true" />
            </button>

            {open && (
                <div
                    role="dialog"
                    aria-label="Notifications"
                    className={`glass-warm absolute top-full mt-2 z-40 w-72 rounded-[var(--dash-r-card)] ${
                        align === 'right' ? 'right-0' : 'left-0'
                    }`}
                >
                    <div className="flex items-center justify-between gap-2 px-4 pt-3">
                        <span className="dash-label">Notifications</span>
                        <ComingSoon />
                    </div>
                    <EmptyState
                        icon={<IoNotificationsOutline />}
                        title="Notifications — Coming Soon"
                        body="New paid orders, requests awaiting a quote and low-stock alerts will land here once the notification centre is wired up."
                        className="py-8"
                    />
                </div>
            )}
        </div>
    )
}
