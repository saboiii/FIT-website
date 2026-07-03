'use client'
import { useCallback, useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Image from '@tiptap/extension-image'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import {
    LuBold, LuItalic, LuUnderline, LuStrikethrough, LuList, LuListOrdered,
    LuQuote, LuLink, LuImage, LuUndo, LuRedo, LuAlignLeft, LuAlignCenter,
    LuAlignRight, LuMinus, LuHighlighter,
} from 'react-icons/lu'

// Node names/attrs must stay in sync with lib/blog/renderTiptap.js.
const extensions = [
    StarterKit.configure({ link: false, underline: false }),
    Underline,
    Link.configure({ openOnClick: false }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Image.configure({ inline: false, allowBase64: false }),
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    Placeholder.configure({ placeholder: 'Write your post…' }),
]

async function uploadImage(file) {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('uploadPath', 'blog')
    const res = await fetch('/api/admin/upload/images', { method: 'POST', body: formData })
    if (!res.ok) throw new Error('Upload failed')
    const data = await res.json()
    const key = data.files?.[0]
    if (!key) throw new Error('Upload failed')
    return `/api/proxy?key=${encodeURIComponent(key)}`
}

function ToolbarButton({ onClick, active, title, children, disabled }) {
    return (
        <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`p-1.5 rounded cursor-pointer text-sm disabled:opacity-30 ${active ? 'bg-textColor text-background' : 'text-lightColor hover:text-textColor hover:bg-borderColor/40'}`}
        >
            {children}
        </button>
    )
}

// Crop modal: file → 16:9-default crop → canvas → blob → S3 → insert node.
function CropModal({ src, onCancel, onConfirm, busy }) {
    const imgRef = useRef(null)
    const [crop, setCrop] = useState(null)
    const [completed, setCompleted] = useState(null)

    const onImageLoad = (e) => {
        const { width, height } = e.currentTarget
        const initial = centerCrop(makeAspectCrop({ unit: '%', width: 90 }, 16 / 9, width, height), width, height)
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
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <div className="bg-background border border-borderColor rounded-md max-w-2xl w-full p-4 flex flex-col gap-3">
                <p className="text-sm font-medium text-textColor">Crop image</p>
                <div className="max-h-[60vh] overflow-auto flex justify-center">
                    <ReactCrop crop={crop} onChange={(_, pc) => setCrop(pc)} onComplete={(px) => setCompleted(px)}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img ref={imgRef} src={src} alt="To crop" onLoad={onImageLoad} style={{ maxWidth: '100%' }} />
                    </ReactCrop>
                </div>
                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onCancel} className="text-xs px-4 py-2 border border-borderColor rounded-full hover:bg-baseColor cursor-pointer">
                        Cancel
                    </button>
                    <button type="button" onClick={confirm} disabled={busy} className="text-xs px-4 py-2 bg-textColor text-background rounded-full hover:bg-textColor/90 cursor-pointer disabled:opacity-50">
                        {busy ? 'Uploading…' : 'Insert image'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function TiptapEditor({ value, onChange }) {
    const [cropSrc, setCropSrc] = useState(null)
    const [uploading, setUploading] = useState(false)
    const fileInputRef = useRef(null)

    const editor = useEditor({
        extensions,
        content: value || null,
        immediatelyRender: false,
        onUpdate: ({ editor: e }) => onChange?.(e.getJSON()),
        editorProps: {
            attributes: {
                class: 'prose max-w-none focus:outline-none min-h-[280px] px-4 py-3 text-sm',
            },
            handleDrop: (view, event) => {
                const file = event.dataTransfer?.files?.[0]
                if (file && file.type.startsWith('image/')) {
                    event.preventDefault()
                    openCropForFile(file)
                    return true
                }
                return false
            },
            handlePaste: (view, event) => {
                const file = Array.from(event.clipboardData?.files || []).find((f) => f.type.startsWith('image/'))
                if (file) {
                    event.preventDefault()
                    openCropForFile(file)
                    return true
                }
                return false
            },
        },
    })

    const openCropForFile = (file) => {
        const reader = new FileReader()
        reader.onload = () => setCropSrc(String(reader.result))
        reader.readAsDataURL(file)
    }

    const insertCropped = useCallback(async (blob) => {
        setUploading(true)
        try {
            const src = await uploadImage(new File([blob], 'inline.jpg', { type: 'image/jpeg' }))
            editor?.chain().focus().setImage({ src }).run()
            setCropSrc(null)
        } catch {
            alert('Image upload failed')
        } finally {
            setUploading(false)
        }
    }, [editor])

    const setLink = () => {
        if (!editor) return
        const prev = editor.getAttributes('link').href || ''
        const url = window.prompt('Link URL', prev)
        if (url === null) return
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run()
        } else {
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
        }
    }

    if (!editor) return null

    return (
        <div className="border border-borderColor rounded-md overflow-hidden bg-background">
            <div className="flex flex-wrap items-center gap-0.5 border-b border-borderColor px-2 py-1.5 bg-baseColor">
                <select
                    value={
                        editor.isActive('heading', { level: 2 }) ? 'h2'
                            : editor.isActive('heading', { level: 3 }) ? 'h3'
                                : 'p'
                    }
                    onChange={(e) => {
                        const v = e.target.value
                        if (v === 'p') editor.chain().focus().setParagraph().run()
                        else editor.chain().focus().toggleHeading({ level: v === 'h2' ? 2 : 3 }).run()
                    }}
                    className="text-xs border border-borderColor rounded px-1 py-1 mr-1 bg-background cursor-pointer"
                    title="Text style"
                >
                    <option value="p">Paragraph</option>
                    <option value="h2">Heading</option>
                    <option value="h3">Subheading</option>
                </select>
                <ToolbarButton title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><LuBold /></ToolbarButton>
                <ToolbarButton title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><LuItalic /></ToolbarButton>
                <ToolbarButton title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}><LuUnderline /></ToolbarButton>
                <ToolbarButton title="Strikethrough" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}><LuStrikethrough /></ToolbarButton>
                <ToolbarButton title="Highlight" active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()}><LuHighlighter /></ToolbarButton>
                <label className="p-1.5 rounded cursor-pointer text-lightColor hover:text-textColor" title="Text colour">
                    <input
                        type="color"
                        className="w-4 h-4 border-0 p-0 bg-transparent cursor-pointer align-middle"
                        value={editor.getAttributes('textStyle').color || '#111111'}
                        onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                    />
                </label>
                <span className="w-px h-4 bg-borderColor mx-1" />
                <ToolbarButton title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}><LuList /></ToolbarButton>
                <ToolbarButton title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}><LuListOrdered /></ToolbarButton>
                <ToolbarButton title="Quote" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}><LuQuote /></ToolbarButton>
                <ToolbarButton title="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}><LuMinus /></ToolbarButton>
                <span className="w-px h-4 bg-borderColor mx-1" />
                <ToolbarButton title="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}><LuAlignLeft /></ToolbarButton>
                <ToolbarButton title="Align centre" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}><LuAlignCenter /></ToolbarButton>
                <ToolbarButton title="Align right" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}><LuAlignRight /></ToolbarButton>
                <span className="w-px h-4 bg-borderColor mx-1" />
                <ToolbarButton title="Link" active={editor.isActive('link')} onClick={setLink}><LuLink /></ToolbarButton>
                <ToolbarButton title="Insert image" onClick={() => fileInputRef.current?.click()}><LuImage /></ToolbarButton>
                <span className="w-px h-4 bg-borderColor mx-1" />
                <ToolbarButton title="Undo" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}><LuUndo /></ToolbarButton>
                <ToolbarButton title="Redo" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}><LuRedo /></ToolbarButton>
            </div>
            <EditorContent editor={editor} />
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) openCropForFile(f)
                    e.target.value = ''
                }}
            />
            {cropSrc && (
                <CropModal src={cropSrc} busy={uploading} onCancel={() => setCropSrc(null)} onConfirm={insertCropped} />
            )}
        </div>
    )
}
