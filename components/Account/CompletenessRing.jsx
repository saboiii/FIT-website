'use client'
// "Complete your profile" ring (reference: docs/account-ui-reference-images/
// account-ui.png). An SVG progress ring, ink stroke on a line-colour track,
// the derived percentage in the middle, plus a per-item checklist: done items
// get an ink check, missing ones a hatch dot and a jump link to their section.
// Purely derived from data the account area already has; no backend.
import { IoCheckmarkOutline } from 'react-icons/io5'

const SIZE = 132
const STROKE = 7
const R = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * R

export default function CompletenessRing({ items = [], onGo }) {
    const total = items.length
    const done = items.filter((i) => i.done).length
    const percent = total ? Math.round((done / total) * 100) : 0

    return (
        <div>
            <div
                className="relative mx-auto h-[132px] w-[132px]"
                role="img"
                aria-label={`Profile ${percent}% complete`}
            >
                <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
                    <circle
                        cx={SIZE / 2}
                        cy={SIZE / 2}
                        r={R}
                        fill="none"
                        stroke="var(--dash-line)"
                        strokeWidth={STROKE}
                    />
                    <circle
                        cx={SIZE / 2}
                        cy={SIZE / 2}
                        r={R}
                        fill="none"
                        stroke="var(--dash-ink)"
                        strokeWidth={STROKE}
                        strokeLinecap="round"
                        strokeDasharray={CIRCUMFERENCE}
                        strokeDashoffset={CIRCUMFERENCE * (1 - percent / 100)}
                    />
                </svg>
                <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
                    <span className="text-[26px] font-semibold tracking-[-0.02em] tabular-nums">
                        {percent}%
                    </span>
                </div>
            </div>

            <ul className="mt-5 flex flex-col">
                {items.map((item) => (
                    <li key={item.key}>
                        {item.done ? (
                            <div className="flex items-center gap-2.5 px-2 py-1.5">
                                <IoCheckmarkOutline
                                    size={14}
                                    aria-hidden="true"
                                    className="shrink-0 text-[var(--dash-ink)]"
                                />
                                <span className="text-[13px] dash-soft">{item.label}</span>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => onGo && onGo(item.tab)}
                                className="dash-hoverable flex w-full items-center gap-2.5 rounded-[var(--dash-r-inner)] px-2 py-1.5 text-left cursor-pointer hover:bg-[var(--dash-sun-soft)]"
                            >
                                <span
                                    aria-hidden="true"
                                    className="dash-hatch h-3 w-3 shrink-0 rounded-full border border-[var(--dash-line)] bg-[var(--dash-card)]"
                                />
                                <span className="text-[13px] font-medium">{item.label}</span>
                            </button>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    )
}
