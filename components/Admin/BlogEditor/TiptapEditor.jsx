'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useEditor, EditorContent, useEditorState, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus'
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
import { Sheet } from '@/components/dashboard-ui'
import { useToast } from '@/components/General/ToastProvider'
import { HtmlBlock, sanitizeHtmlBlock } from '@/lib/blog/htmlBlock'
import {
    LuBold, LuItalic, LuUnderline, LuStrikethrough, LuList, LuListOrdered,
    LuQuote, LuLink, LuImage, LuAlignLeft, LuAlignCenter, LuAlignRight,
    LuMinus, LuHighlighter, LuHeading2, LuHeading3, LuCheck, LuUnlink,
    LuCode,
} from 'react-icons/lu'

// Same source editor the legacy markdown posts use — code pane only, no
// markdown preview/toolbar. It holds the raw HTML as plain text with syntax
// colouring, so nothing re-parses or reformats the markup.
const SourceEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })

/**
 * NodeView for the shared htmlBlock node (lib/blog/htmlBlock.js). Two modes,
 * swapped IN PLACE (client directive): the rendered HTML, or the code editor
 * occupying the same spot. The raw markup lives in attrs.html and is only
 * ever edited as a plain string, so ProseMirror never parses it (imported
 * legacy posts can carry up to ~700KB of hand-authored HTML).
 */
function HtmlBlockView({ node, updateAttributes }) {
    const [editing, setEditing] = useState(() => !node.attrs.html)
    const [draft, setDraft] = useState(node.attrs.html || '')

    const startEditing = () => {
        setDraft(node.attrs.html || '')
        setEditing(true)
    }

    const done = () => {
        updateAttributes({ html: draft }) // undoable via the editor history
        setEditing(false)
    }

    return (
        <NodeViewWrapper>
            <div
                contentEditable={false}
                className="group relative my-2 rounded-[var(--dash-r-inner)] outline outline-1 outline-transparent outline-offset-4 hover:outline-[var(--dash-line)] transition-[outline-color]"
            >
                <button
                    type="button"
                    onClick={editing ? done : startEditing}
                    className="dash-hoverable absolute top-2 right-2 z-10 rounded-full px-3 py-1 text-[12px] font-medium border border-[var(--dash-line)] bg-[var(--dash-card)] hover:bg-[var(--dash-canvas)] cursor-pointer shadow-[var(--dash-shadow-float)]"
                >
                    {editing ? 'Done' : 'Edit HTML'}
                </button>
                {editing ? (
                    <div data-color-mode="light" className="border border-[var(--dash-line)] rounded-[var(--dash-r-inner)] overflow-hidden">
                        <SourceEditor
                            value={draft}
                            onChange={(v) => setDraft(v ?? '')}
                            preview="edit"
                            hideToolbar
                            visibleDragbar
                            height={Math.min(720, Math.max(280, Math.ceil((node.attrs.html || '').length / 60) * 18))}
                            textareaProps={{ spellCheck: false, 'aria-label': 'HTML source', placeholder: '<section>Paste or write raw HTML</section>' }}
                        />
                    </div>
                ) : node.attrs.html ? (
                    <div dangerouslySetInnerHTML={{ __html: sanitizeHtmlBlock(node.attrs.html) }} />
                ) : (
                    <div className="text-[13px] text-[var(--dash-ink-soft)] border border-dashed border-[var(--dash-line)] rounded-[var(--dash-r-inner)] px-4 py-6 text-center">
                        Empty HTML block. Use Edit HTML to add markup.
                    </div>
                )}
            </div>
        </NodeViewWrapper>
    )
}

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
    HtmlBlock.extend({
        addNodeView() {
            return ReactNodeViewRenderer(HtmlBlockView)
        },
    }),
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

// On-demand chrome (§5.12): buttons live only in the bubble/floating menus.
function MenuButton({ onClick, active, title, children, disabled }) {
    return (
        <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            disabled={disabled}
            title={title}
            aria-label={title}
            className={`dash-hoverable flex items-center justify-center w-7 h-7 rounded-full cursor-pointer text-[13px] disabled:opacity-30 disabled:cursor-default ${
                active
                    ? 'bg-[var(--dash-ink)] text-[var(--dash-canvas)]'
                    : 'text-[var(--dash-ink-soft)] hover:text-[var(--dash-ink)] hover:bg-[var(--dash-sun-soft)]'
            }`}
        >
            {children}
        </button>
    )
}

function MenuDivider() {
    return <span className="w-px h-4 bg-[var(--dash-line)] mx-0.5" aria-hidden="true" />
}

// Crop flow (unchanged pipeline): file → 16:9-default crop → canvas → blob →
// S3 upload → image node. Hosted in a Tier-2 Sheet instead of a raw overlay.
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
        <Sheet open onClose={onCancel} label="Crop image" widthClass="max-w-2xl">
            <div className="p-5 flex flex-col gap-3">
                <h3 className="dash-section">Crop image</h3>
                <div className="max-h-[60vh] dash-scroll flex justify-center bg-[var(--dash-card)] border border-[var(--dash-line)] rounded-[var(--dash-r-inner)] overflow-hidden">
                    <ReactCrop crop={crop} onChange={(_, pc) => setCrop(pc)} onComplete={(px) => setCompleted(px)}>
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
                        {busy ? 'Uploading…' : 'Insert image'}
                    </button>
                </div>
            </div>
        </Sheet>
    )
}

/**
 * Paper-mode rich editor (§5.12): the body sits directly on the page — no
 * boxed chassis, no fixed toolbar. Formatting appears on demand: a BubbleMenu
 * on text selection, a FloatingMenu on empty lines. `onEditor` exposes the
 * editor instance so the GlassBar can host undo/redo.
 */
export default function TiptapEditor({ value, onChange, onEditor }) {
    const [cropSrc, setCropSrc] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [linkOpen, setLinkOpen] = useState(false)
    const [linkUrl, setLinkUrl] = useState('')
    const fileInputRef = useRef(null)
    const { showToast } = useToast()

    const editor = useEditor({
        extensions,
        content: value || null,
        immediatelyRender: false,
        onUpdate: ({ editor: e }) => onChange?.(e.getJSON()),
        editorProps: {
            attributes: {
                // The page IS the surface (client directive): no focus ring, and a
                // min-height that reaches the bottom of the viewport so clicking
                // anywhere low starts writing. The inline outline:none beats the
                // `.dash :focus-visible` ring on the contenteditable.
                class: 'prose max-w-none focus:outline-none min-h-[calc(100dvh-300px)] py-4 text-sm',
                style: 'outline: none',
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

    // Lift the instance to the GlassBar (undo/redo live there — §5.12).
    useEffect(() => {
        if (!onEditor) return undefined
        onEditor(editor || null)
        return () => onEditor(null)
    }, [editor, onEditor])

    // v3 editors don't re-render on transactions; track active marks here.
    const marks = useEditorState({
        editor,
        selector: ({ editor: e }) => {
            if (!e) return null
            return {
                bold: e.isActive('bold'),
                italic: e.isActive('italic'),
                underline: e.isActive('underline'),
                strike: e.isActive('strike'),
                highlight: e.isActive('highlight'),
                link: e.isActive('link'),
                h2: e.isActive('heading', { level: 2 }),
                h3: e.isActive('heading', { level: 3 }),
                alignLeft: e.isActive({ textAlign: 'left' }),
                alignCenter: e.isActive({ textAlign: 'center' }),
                alignRight: e.isActive({ textAlign: 'right' }),
                color: e.getAttributes('textStyle').color || '#111111',
            }
        },
    })

    // Close the inline link editor whenever the selection moves on.
    useEffect(() => {
        if (!editor) return undefined
        const close = () => setLinkOpen(false)
        editor.on('selectionUpdate', close)
        return () => { editor.off('selectionUpdate', close) }
    }, [editor])

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
            showToast('Image upload failed', 'error')
        } finally {
            setUploading(false)
        }
    }, [editor, showToast])

    const openLinkEditor = () => {
        setLinkUrl(editor?.getAttributes('link').href || '')
        setLinkOpen(true)
    }

    const applyLink = () => {
        if (!editor) return
        const url = linkUrl.trim()
        if (url === '') {
            editor.chain().focus().extendMarkRange('link').unsetLink().run()
        } else {
            editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
        }
        setLinkOpen(false)
    }

    const removeLink = () => {
        editor?.chain().focus().extendMarkRange('link').unsetLink().run()
        setLinkOpen(false)
    }

    if (!editor) return null

    return (
        <div>
            {/* Selection chrome: marks, colour, alignment, link (§5.12). */}
            <BubbleMenu
                editor={editor}
                options={{ placement: 'top', offset: 8 }}
                className="glass-warm flex flex-wrap items-center gap-0.5 rounded-full px-1.5 py-1 shadow-[var(--dash-shadow-float)] max-w-[min(92vw,480px)]"
            >
                {linkOpen ? (
                    <div className="flex items-center gap-0.5 px-1">
                        <input
                            autoFocus
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); applyLink() }
                                if (e.key === 'Escape') { e.preventDefault(); setLinkOpen(false) }
                            }}
                            placeholder="https://…"
                            aria-label="Link URL"
                            className="w-52 bg-transparent outline-none text-[13px] px-2 py-1"
                        />
                        <MenuButton title="Apply link" onClick={applyLink}><LuCheck /></MenuButton>
                        <MenuButton title="Remove link" onClick={removeLink}><LuUnlink /></MenuButton>
                    </div>
                ) : (
                    <>
                        <MenuButton title="Heading" active={marks?.h2} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><LuHeading2 /></MenuButton>
                        <MenuButton title="Subheading" active={marks?.h3} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><LuHeading3 /></MenuButton>
                        <MenuDivider />
                        <MenuButton title="Bold" active={marks?.bold} onClick={() => editor.chain().focus().toggleBold().run()}><LuBold /></MenuButton>
                        <MenuButton title="Italic" active={marks?.italic} onClick={() => editor.chain().focus().toggleItalic().run()}><LuItalic /></MenuButton>
                        <MenuButton title="Underline" active={marks?.underline} onClick={() => editor.chain().focus().toggleUnderline().run()}><LuUnderline /></MenuButton>
                        <MenuButton title="Strikethrough" active={marks?.strike} onClick={() => editor.chain().focus().toggleStrike().run()}><LuStrikethrough /></MenuButton>
                        <MenuButton title="Highlight" active={marks?.highlight} onClick={() => editor.chain().focus().toggleHighlight().run()}><LuHighlighter /></MenuButton>
                        <label className="flex items-center justify-center w-7 h-7 rounded-full cursor-pointer text-[var(--dash-ink-soft)] hover:text-[var(--dash-ink)] hover:bg-[var(--dash-sun-soft)]" title="Text colour">
                            <input
                                type="color"
                                aria-label="Text colour"
                                className="w-4 h-4 border-0 p-0 bg-transparent cursor-pointer align-middle"
                                value={marks?.color || '#111111'}
                                onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                            />
                        </label>
                        <MenuDivider />
                        <MenuButton title="Align left" active={marks?.alignLeft} onClick={() => editor.chain().focus().setTextAlign('left').run()}><LuAlignLeft /></MenuButton>
                        <MenuButton title="Align centre" active={marks?.alignCenter} onClick={() => editor.chain().focus().setTextAlign('center').run()}><LuAlignCenter /></MenuButton>
                        <MenuButton title="Align right" active={marks?.alignRight} onClick={() => editor.chain().focus().setTextAlign('right').run()}><LuAlignRight /></MenuButton>
                        <MenuDivider />
                        <MenuButton title="Link" active={marks?.link} onClick={openLinkEditor}><LuLink /></MenuButton>
                    </>
                )}
            </BubbleMenu>

            {/* Empty-line chrome: block inserts, including the image pipeline. */}
            <FloatingMenu
                editor={editor}
                options={{ placement: 'right', offset: 8 }}
                className="glass-warm flex items-center gap-0.5 rounded-full px-1.5 py-1 shadow-[var(--dash-shadow-float)]"
            >
                <MenuButton title="Heading" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><LuHeading2 /></MenuButton>
                <MenuButton title="Subheading" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><LuHeading3 /></MenuButton>
                <MenuButton title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()}><LuList /></MenuButton>
                <MenuButton title="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()}><LuListOrdered /></MenuButton>
                <MenuButton title="Quote" onClick={() => editor.chain().focus().toggleBlockquote().run()}><LuQuote /></MenuButton>
                <MenuButton title="Divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}><LuMinus /></MenuButton>
                <MenuButton title="Insert image" onClick={() => fileInputRef.current?.click()}><LuImage /></MenuButton>
                <MenuButton title="HTML block" onClick={() => editor.chain().focus().insertContent({ type: 'htmlBlock', attrs: { html: '' } }).run()}><LuCode /></MenuButton>
            </FloatingMenu>

            {/* Grows with the page until very long, then scrolls internally. */}
            <div className="max-h-[300vh] dash-scroll">
                <EditorContent editor={editor} />
            </div>
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
