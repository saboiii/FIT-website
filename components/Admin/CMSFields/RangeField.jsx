'use client'
import { labelCls } from '@/components/DashboardComponents/ProductFormFields/dashFormUi'

/**
 * CMS slider control (blueprint §9.13) — persists a NUMBER through the same
 * PUT as every other field. Used for percentage-style knobs such as the
 * hero-banner overlay (0–80 %, step 5).
 */
export default function RangeField({
    label,
    value = 0,
    onChange,
    min = 0,
    max = 80,
    step = 5,
    suffix = '%',
    helpText,
}) {
    const n = Number.isFinite(Number(value)) ? Number(value) : 0
    return (
        <div className="flex flex-col gap-1.5">
            <label className={labelCls}>{label}</label>
            {helpText && <p className="text-[13px] dash-soft">{helpText}</p>}
            <div className="flex items-center gap-3">
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={n}
                    onChange={(e) => onChange(Number(e.target.value))}
                    aria-label={label}
                    className="flex-1 cursor-pointer accent-[var(--dash-ink)]"
                />
                <span className="dash-data w-12 text-right shrink-0">
                    {n}
                    {suffix}
                </span>
            </div>
        </div>
    )
}
