'use client'
// Inline-edit setting rows (client direction, 2026-07: "luxurious, Apple-esque,
// not a fan of the simple cards view"). Settings render as grouped rows that
// sit on the canvas, separated by hairlines instead of nested cards. Each row
// shows label + current value + a quiet Edit affordance; clicking Edit morphs
// that row in place into inputs with an ink Save and a quiet Cancel. Motion is
// the swap token, transform + opacity only (blueprint §4.5).
import { motion } from 'framer-motion'
import { swap } from '@/lib/motion/tokens'

export const settingInputCls =
    'rounded-[var(--dash-r-inner)] border border-[var(--dash-line)] bg-[var(--dash-card)] px-3 py-1.5 text-[13px] min-w-0 w-full'

// A titled section of rows: 11px uppercase label, hairline top, hairlines
// between rows. Never a bordered card.
export function SettingGroup({ title, action, children }) {
    return (
        <section>
            <div className="flex items-baseline justify-between gap-3">
                <h3 className="dash-label">{title}</h3>
                {action || null}
            </div>
            <div className="mt-2 border-t border-[var(--dash-line)] divide-y divide-[var(--dash-line)]">
                {children}
            </div>
        </section>
    )
}

const quietBtnCls =
    'dash-hoverable shrink-0 rounded-full px-3 py-1 text-[12px] font-medium dash-soft hover:text-[var(--dash-ink)] hover:bg-[var(--dash-sun-soft)] cursor-pointer disabled:opacity-50'

// One setting row. View mode: label (dash-label) over value (14px ink) with a
// quiet Edit on the right. Edit mode: the same row swaps in place into the
// provided inputs (children) plus ink Save / quiet Cancel.
export function SettingRow({
    label,
    value,
    hint,
    editing = false,
    onEdit,
    onCancel,
    onSave,
    busy = false,
    editLabel = 'Edit',
    action,
    children,
}) {
    return (
        <div className="py-4">
            {editing ? (
                <motion.div
                    key="edit"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={swap}
                >
                    <span className="dash-label">{label}</span>
                    <div className="mt-2.5 max-w-md">{children}</div>
                    <div className="mt-3.5 flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={onSave}
                            disabled={busy}
                            className="dash-hoverable inline-flex items-center rounded-full bg-[var(--dash-ink)] text-[var(--dash-canvas)] px-4 py-1.5 text-[12px] font-medium cursor-pointer disabled:opacity-50 active:scale-[0.97]"
                        >
                            Save
                        </button>
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={busy}
                            className="dash-hoverable rounded-full px-3 py-1.5 text-[12px] font-medium dash-soft hover:text-[var(--dash-ink)] cursor-pointer disabled:opacity-50"
                        >
                            Cancel
                        </button>
                    </div>
                </motion.div>
            ) : (
                <motion.div
                    key="view"
                    initial={false}
                    className="flex items-start justify-between gap-4"
                >
                    <div className="min-w-0 flex-1">
                        <span className="dash-label">{label}</span>
                        <div className="mt-1 text-[14px] break-words">{value}</div>
                        {hint && <p className="dash-data dash-soft mt-1">{hint}</p>}
                    </div>
                    {onEdit ? (
                        <button
                            type="button"
                            onClick={onEdit}
                            disabled={busy}
                            aria-label={`Edit ${String(label).toLowerCase()}`}
                            className={quietBtnCls}
                        >
                            {editLabel}
                        </button>
                    ) : (
                        action || null
                    )}
                </motion.div>
            )}
        </div>
    )
}
