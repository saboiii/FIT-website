'use client'
import Sheet from './Sheet'

/**
 * `?` keyboard-shortcuts sheet (blueprint §9.6, Stripe pattern) — a small
 * Tier-2 sheet listing every global binding inside the admin shell. Opened
 * by pressing `?` when no editable element is focused; Esc/scrim closes.
 */
const BINDINGS = [
    { keys: ['⌘', 'K'], label: 'Open the command palette (Ctrl+K on Windows)' },
    { keys: ['/'], label: 'Search or jump to a panel' },
    { keys: ['Esc'], label: 'Close dialogs, sheets and tours' },
    { keys: ['?'], label: 'Show this shortcuts sheet' },
]

export default function ShortcutsSheet({ open, onClose }) {
    return (
        <Sheet open={open} onClose={onClose} label="Keyboard shortcuts" widthClass="max-w-sm">
            <div className="p-5">
                <h3 className="dash-section">Keyboard shortcuts</h3>
                <ul className="mt-3 flex flex-col">
                    {BINDINGS.map((b) => (
                        <li
                            key={b.label}
                            className="flex items-center justify-between gap-4 py-2.5 border-b border-[var(--dash-line)] last:border-b-0"
                        >
                            <span className="text-[13px] text-[var(--dash-ink)]">{b.label}</span>
                            <span className="flex items-center gap-1 shrink-0">
                                {b.keys.map((k) => (
                                    <kbd
                                        key={k}
                                        className="dash-label rounded-md border border-[var(--dash-line)] bg-[var(--dash-card)] px-1.5 py-0.5"
                                    >
                                        {k}
                                    </kbd>
                                ))}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </Sheet>
    )
}
