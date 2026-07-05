'use client'
import { inputCls, labelCls } from '@/components/DashboardComponents/ProductFormFields/dashFormUi'

export default function SelectField({
    label,
    value,
    onChange,
    options = [],
    placeholder = "Select an option",
    required = false,
    disabled = false,
    className = ""
}) {
    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            <label className={labelCls}>
                {label} {required && <span className="text-[var(--dash-bad)]">*</span>}
            </label>
            <select
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
                className={`${inputCls()} cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
            >
                <option value="">{placeholder}</option>
                {options.map((option, index) => (
                    <option key={index} value={option.value || option}>
                        {option.label || option}
                    </option>
                ))}
            </select>
        </div>
    )
}
