import React from 'react'
import { RxCross1 } from 'react-icons/rx'
import { InfoStrip, dropZoneCls, labelCls } from './dashFormUi'

export default function PaidAssetsField({
    form,
    modelValidationErrors,
    dragActive,
    setDragActive,
    modelInputRef,
    handleModelChange,
    handleModelDrop,
    handleRemoveModel,
    pendingModels
}) {
    const hasPaidAssets = (form.paidAssets?.length || 0) + pendingModels.length > 0
    const hasDigitalDelivery = form.delivery?.deliveryTypes?.some(dt => dt.type === 'digital' || dt === 'digital')

    return (
        <div className='flex flex-col gap-2 w-full'>
            <label className={labelCls}>Paid Assets (3D Models)</label>

            {hasPaidAssets && !hasDigitalDelivery && (
                <InfoStrip tone="info" title="Delivery type will be set to digital">
                    <p>Paid assets (downloadable files) can only be delivered to customers as online products. The delivery type will automatically be set to digital delivery when you save this product.</p>
                </InfoStrip>
            )}

            {modelValidationErrors.length > 0 && (
                <InfoStrip tone="error" title="Model Upload Errors:">
                    <ul className="space-y-1">
                        {modelValidationErrors.map((error, index) => (
                            <li key={index}>• {error}</li>
                        ))}
                    </ul>
                </InfoStrip>
            )}
            <div
                className={dropZoneCls(dragActive)}
                onClick={() => modelInputRef.current && modelInputRef.current.click()}
                onDragOver={e => {
                    e.preventDefault();
                    setDragActive(true);
                }}
                onDragLeave={e => {
                    e.preventDefault();
                    setDragActive(false);
                }}
                onDrop={e => {
                    e.preventDefault();
                    setDragActive(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        if (typeof handleModelDrop === 'function') {
                            handleModelDrop(e.dataTransfer.files);
                        }
                    }
                }}
            >
                Click to choose files or drag and drop here
                <input
                    type="file"
                    accept=".obj,.glb,.gltf,.stl,.blend,.fbx,.zip,.rar,.7z,.3mf"
                    multiple
                    onChange={handleModelChange}
                    style={{ display: "none" }}
                    ref={modelInputRef}
                />
            </div>
            <ul className="flex flex-col text-[13px] w-fit">
                {[...(form.paidAssets || []), ...pendingModels].map((item, idx) => {
                    const isPending = idx >= (form.paidAssets?.length || 0);
                    return (
                        <div className='gap-4 flex flex-row items-center justify-between' key={idx}>
                            <li className='flex truncate' title={isPending ? item.name : item}>
                                {isPending ? (
                                    <span className="underline">{item.name}</span>
                                ) : (
                                    <a
                                        href={`/api/proxy?key=${encodeURIComponent(item)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="underline"
                                        download
                                    >
                                        {item.replace(/^models\//, "")}
                                    </a>
                                )}
                            </li>
                            <RxCross1
                                className='flex cursor-pointer'
                                onClick={() => handleRemoveModel(idx)}
                                size={12}
                            />
                        </div>
                    );
                })}
            </ul>
        </div>
    )
}
