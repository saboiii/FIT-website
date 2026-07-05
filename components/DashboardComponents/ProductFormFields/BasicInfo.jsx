import React from 'react'
import FieldErrorBanner from './FieldErrorBanner'
import { inputCls, labelCls } from './dashFormUi'

export default function BasicInfo({ form, handleChange, missingFields = [] }) {
    const nameMissing = missingFields.includes('name')
    const descriptionMissing = missingFields.includes('description')

    return (
        <>
            {(nameMissing || descriptionMissing) && (
                <div className="mb-3 w-full">
                    <FieldErrorBanner
                        title="Product details required"
                        message={[
                            nameMissing ? 'Add a clear product name so customers can recognise it.' : null,
                            descriptionMissing ? 'Provide a short description explaining what the product is.' : null,
                        ].filter(Boolean).join(' ')}
                    />
                </div>
            )}
            {/* product name */}
            <div className="flex flex-col gap-1.5 w-full">
                <label htmlFor="name" className={labelCls}>Product Name</label>
                <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={form.name}
                    onChange={handleChange}
                    className={inputCls(nameMissing)}
                    placeholder="Enter product name"
                />
            </div>

            {/* product desc */}
            <div className="flex flex-col gap-1.5 w-full">
                <label htmlFor="description" className={labelCls}>Product Description</label>
                <textarea
                    id="description"
                    name="description"
                    rows={4}
                    maxLength={1000}
                    required
                    value={form.description}
                    onChange={handleChange}
                    className={inputCls(descriptionMissing)}
                    placeholder="Enter product description"
                    wrap="hard"
                />
            </div>
        </>
    )
}
