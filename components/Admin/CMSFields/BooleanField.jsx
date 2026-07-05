'use client'
import { labelCls } from '@/components/DashboardComponents/ProductFormFields/dashFormUi'

export default function BooleanField({ label, value, onChange }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label className={labelCls}>{label}</label>
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    role="switch"
                    aria-checked={!!value}
                    aria-label={label}
                    onClick={() => onChange(!value)}
                    className={`dash-hoverable relative inline-flex h-6 w-11 items-center rounded-full cursor-pointer
                        ${value ? 'bg-[var(--dash-ink)]' : 'bg-[var(--dash-line)]'}`}
                >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-[var(--dash-card)] transition-transform
                        ${value ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-[13px] dash-soft">{value ? 'On' : 'Off'}</span>
            </div>
        </div>
    )
}
