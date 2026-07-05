'use client'
import Sheet from './Sheet'

/**
 * THE confirmation affordance (§4.8 #11) — window.confirm/alert are banned
 * in dashboards. Destructive confirms use tone="bad".
 */
export default function ConfirmDialog({
    open,
    onClose,
    onConfirm,
    title,
    body,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    tone = 'ink',
    busy = false,
}) {
    return (
        <Sheet open={open} onClose={onClose} label={title}>
            <div className="p-6">
                <h3 className="dash-section">{title}</h3>
                {body && <p className="text-[13px] dash-soft mt-2">{body}</p>}
                <div className="flex justify-end gap-2 mt-5">
                    <button
                        onClick={onClose}
                        className="dash-hoverable rounded-full px-4 py-2 text-[13px] font-medium border border-[var(--dash-line)] bg-[var(--dash-card)] cursor-pointer hover:bg-[var(--dash-canvas)]"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={busy}
                        className={`dash-hoverable rounded-full px-4 py-2 text-[13px] font-medium cursor-pointer disabled:opacity-50 active:scale-[0.97] ${
                            tone === 'bad'
                                ? 'bg-[var(--dash-bad)] text-[var(--dash-canvas)]'
                                : 'bg-[var(--dash-ink)] text-[var(--dash-canvas)]'
                        }`}
                    >
                        {busy ? 'Working…' : confirmLabel}
                    </button>
                </div>
            </div>
        </Sheet>
    )
}
