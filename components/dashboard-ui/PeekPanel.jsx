'use client'
import Sheet from './Sheet'

/**
 * Right slide-over preview (§4.8 #10, Linear peek): triage without losing
 * list position. Give it the same detail component a full page would use.
 */
export default function PeekPanel({ open, onClose, title, actions, widthClass, children }) {
    return (
        <Sheet open={open} onClose={onClose} side="right" label={title} widthClass={widthClass}>
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--dash-line)] sticky top-0 glass-warm rounded-tl-[var(--dash-r-card)] z-10">
                <h3 className="dash-section truncate">{title}</h3>
                <div className="flex items-center gap-2 shrink-0">
                    {actions}
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="dash-hoverable rounded-full h-7 w-7 grid place-items-center border border-[var(--dash-line)] bg-[var(--dash-card)] cursor-pointer hover:bg-[var(--dash-canvas)] text-[13px]"
                    >
                        ✕
                    </button>
                </div>
            </div>
            <div className="p-5">{children}</div>
        </Sheet>
    )
}
