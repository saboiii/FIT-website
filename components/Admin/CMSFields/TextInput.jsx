'use client'
import { inputCls, labelCls } from '@/components/DashboardComponents/ProductFormFields/dashFormUi'

export default function TextInput({
    label,
    value,
    onChange,
    placeholder,
    required = false,
    disabled = false,
    className = "",
    rows = 1,
    helpText
}) {
    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            <label className={labelCls}>
                {label} {required && <span className="text-[var(--dash-bad)]">*</span>}
            </label>
            {helpText && (
                <p className="text-[13px] dash-soft">{helpText}</p>
            )}
            {rows > 1 ? (
                <textarea
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    rows={rows}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`${inputCls()} disabled:opacity-50`}
                />
            ) : (
                <input
                    type="text"
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`${inputCls()} disabled:opacity-50`}
                />
            )}
        </div>
    )
}
