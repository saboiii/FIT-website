'use client'
// Crop step for shop banner/logo uploads (same pipeline as the blog editor's
// CropModal: file -> aspect crop -> canvas -> blob -> caller uploads). Hosted
// in a Tier-2 Sheet; aspect is fixed per image kind (banner ~4:1, logo 1:1).
import { useRef, useState } from 'react'
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { Sheet } from '@/components/dashboard-ui'

export default function ShopImageCropModal({ src, aspect = 4, circular = false, title = 'Crop image', onCancel, onConfirm, busy }) {
    const imgRef = useRef(null)
    const [crop, setCrop] = useState(null)
    const [completed, setCompleted] = useState(null)

    const onImageLoad = (e) => {
        const { width, height } = e.currentTarget
        const initial = centerCrop(makeAspectCrop({ unit: '%', width: 90 }, aspect, width, height), width, height)
        setCrop(initial)
    }

    const confirm = async () => {
        const image = imgRef.current
        if (!image) return
        const c = completed || {
            x: 0, y: 0, width: image.width, height: image.height, unit: 'px',
        }
        const scaleX = image.naturalWidth / image.width
        const scaleY = image.naturalHeight / image.height
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(c.width * scaleX)
        canvas.height = Math.round(c.height * scaleY)
        const ctx = canvas.getContext('2d')
        ctx.drawImage(image, c.x * scaleX, c.y * scaleY, c.width * scaleX, c.height * scaleY, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => blob && onConfirm(blob), 'image/jpeg', 0.92)
    }

    return (
        <Sheet open onClose={onCancel} label={title} widthClass="max-w-2xl">
            <div className="p-5 flex flex-col gap-3">
                <h3 className="dash-section">{title}</h3>
                <div className="max-h-[60vh] dash-scroll flex justify-center bg-[var(--dash-card)] border border-[var(--dash-line)] rounded-[var(--dash-r-inner)] overflow-hidden">
                    <ReactCrop
                        crop={crop}
                        aspect={aspect}
                        circularCrop={circular}
                        onChange={(_, pc) => setCrop(pc)}
                        onComplete={(px) => setCompleted(px)}
                    >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img ref={imgRef} src={src} alt="To crop" onLoad={onImageLoad} style={{ maxWidth: '100%' }} />
                    </ReactCrop>
                </div>
                <div className="flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="dash-hoverable rounded-full px-4 py-2 text-[13px] font-medium border border-[var(--dash-line)] bg-[var(--dash-card)] hover:bg-[var(--dash-canvas)] cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={confirm}
                        disabled={busy}
                        className="dash-hoverable rounded-full px-4 py-2 text-[13px] font-medium bg-[var(--dash-ink)] text-[var(--dash-canvas)] cursor-pointer disabled:opacity-50 active:scale-[0.97]"
                    >
                        {busy ? 'Uploading...' : 'Use image'}
                    </button>
                </div>
            </div>
        </Sheet>
    )
}
