import React from 'react'
import ImageDrop from '@/components/General/ImageDrop'
import FieldErrorBanner from './FieldErrorBanner'
import { InfoStrip } from './dashFormUi'

const ImagesField = function ImagesField({
    images,
    imageValidationErrors,
    imageInputRef,
    handleImageChange,
    handleImageDrop,
    handleRemoveImage,
    pendingImages,
    setImageValidationErrors,
    missingFields = []
}) {
    const isMissing = missingFields.includes('images');

    return (
        <div className="flex flex-col gap-2 w-full">
            {isMissing && (
                <FieldErrorBanner
                    title="Product images required"
                    message="Add at least one image so customers can see what they are buying."
                    className="mb-2"
                />
            )}

            {imageValidationErrors.length > 0 && (
                <InfoStrip tone="error" className="mb-2">
                    <div className="space-y-1">
                        {imageValidationErrors.map((error, index) => (
                            <div key={index}> {error}</div>
                        ))}
                    </div>
                </InfoStrip>
            )}

            <ImageDrop
                label="Product Images"
                value={images}
                pendingFiles={pendingImages}
                multiple={true}
                maxFiles={7}
                onFilesSelected={(files) => {
                    // prefer the existing handlers from ProductForm
                    if (typeof handleImageDrop === 'function') handleImageDrop(files)
                    else if (typeof handleImageChange === 'function') {
                        // create synthetic event-like object for backward compatibility
                        handleImageChange({ target: { files } })
                    }
                }}
                onRemove={handleRemoveImage}
                inputRef={imageInputRef}
                onValidationError={(msg) => {
                    if (!msg) return
                    if (typeof setImageValidationErrors === 'function') {
                        setImageValidationErrors(prev => {
                            if (prev.includes(msg)) return prev
                            return [...prev, msg]
                        })
                    }
                }}
            />
        </div>
    )
}

export default React.memo(ImagesField);
