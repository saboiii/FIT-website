import dynamic from 'next/dynamic'
import '@uiw/react-md-editor/markdown-editor.css'
import { useRef, useState } from 'react'
import { useToast } from '@/components/General/ToastProvider'
import { labelCls, InfoStrip } from '@/components/DashboardComponents/ProductFormFields/dashFormUi'

const MDEditor = dynamic(
    () => import('@uiw/react-md-editor').then((mod) => mod.default),
    { ssr: false }
)

export default function RichTextEditor({
    label,
    value,
    onChange,
    placeholder,
    required = false,
    disabled = false,
    className = "",
    height = 300,
    showHtmlTip = false
}) {
    const [uploading, setUploading] = useState(false)
    const { showToast } = useToast()

    const handleFilesSelected = async (e) => {
        const files = Array.from(e.target.files || [])
        if (!files.length) return
        try {
            setUploading(true)
            const formData = new FormData()
            for (const f of files) formData.append('files', f)

            const res = await fetch('/api/upload/images', {
                method: 'POST',
                body: formData,
            })
            const data = await res.json()
            if (!res.ok) {
                throw new Error(data?.error || 'Upload failed')
            }

            const bucket = process.env.NEXT_PUBLIC_S3_BUCKET_NAME
            const base = bucket ? `https://${bucket}.s3.amazonaws.com` : ''

            const alt = files.length === 1 ? (files[0]?.name?.split('.')?.[0] || 'image') : 'image'
            const insert = (url) => `\n\n![${alt}](${url})\n`

            const urls = (data?.files || []).map((key) => base ? `${base}/${key}` : key)
            const addition = urls.map(insert).join('')
            onChange((value || '') + addition)
        } catch (err) {
            console.error('Image upload error:', err)
            showToast(err.message || 'Image upload failed', 'error')
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            <label className={labelCls}>
                {label} {required && <span className="text-[var(--dash-bad)]">*</span>}
                <span className="normal-case tracking-normal font-normal ml-2">
                    (Rich Text Editor - Markdown/HTML)
                </span>
            </label>


            <div className="border border-[var(--dash-line)] rounded-[var(--dash-r-inner)] overflow-hidden">
                <MDEditor
                    value={value || ''}
                    onChange={(val) => onChange(val || '')}
                    height={height}
                    preview="edit"
                    hideToolbar={false}
                    data-color-mode="light"
                    style={{
                        backgroundColor: 'white',
                    }}
                    textareaProps={{
                        placeholder: placeholder || `Enter ${label?.toLowerCase() || 'content'} here... You can use Markdown syntax or HTML tags.`,
                        disabled: disabled,
                        style: {
                            fontSize: '14px',
                            lineHeight: '1.5',
                            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                        }
                    }}
                />
            </div>

            {showHtmlTip && (
                <InfoStrip tone="info">
                    <strong>Tip:</strong> This editor supports both Markdown and HTML. Use the toolbar for formatting, or write HTML directly for complex layouts.
                </InfoStrip>
            )}
        </div>
    )
}