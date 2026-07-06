'use client'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import { AnimatePresence, motion } from 'framer-motion'
import { sheet, swapExit } from '@/lib/motion/tokens'
import { generateJSON, generateHTML } from '@tiptap/html'
import { oneDark } from '@codemirror/theme-one-dark'
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
import { HtmlBlock, sanitizeHtmlBlock, docToArticleHtml, segmentBody } from '@/lib/blog/htmlBlock'
import {
    LuBold, LuItalic, LuUnderline, LuStrikethrough, LuList, LuListOrdered,
    LuQuote, LuLink, LuImage, LuAlignLeft, LuAlignCenter, LuAlignRight,
    LuMinus, LuHighlighter, LuHeading2, LuHeading3, LuCheck, LuUnlink,
    LuCode,
} from 'react-icons/lu'

// Proper HTML code editor: CodeMirror with the HTML language (syntax
// colouring, line numbers, bracket matching, tag/attribute autocompletion and
// auto-closing tags). Loaded lazily — admin editor only.
const CodeMirror = dynamic(() => import('@uiw/react-codemirror'), { ssr: false })

// Lets HTML-block NodeViews open the DOCUMENT-level code view and report
// cursor position to the ONE shared tooltip the editor owns (one pill total,
// never one per block).
const CodeModeContext = createContext({ openCode: () => {}, moveHint: () => {}, clearHint: () => {} })

/**
 * NodeView for the shared htmlBlock node (lib/blog/htmlBlock.js): renders the
 * raw markup read-only. Editing happens in the whole-article code view; the
 * editor-level tooltip follows the cursor over the block. Clicking ANYWHERE
 * on the block opens the code view, with the click intercepted so links
 * inside imported sections cannot navigate the admin away.
 */
function HtmlBlockView({ node, selected }) {
    const { openCode, moveHint, clearHint } = useContext(CodeModeContext)

    return (
        <NodeViewWrapper>
            <div
                contentEditable={false}
                className={`relative my-2 rounded-[var(--dash-r-inner)] outline outline-1 outline-offset-4 transition-[outline-color] ${
                    selected ? 'outline-[var(--dash-focus-line)]' : 'outline-transparent hover:outline-[var(--dash-line)]'
                }`}
            >
                {node.attrs.html ? (
                    <div
                        onMouseMove={(e) => moveHint(e.clientX, e.clientY)}
                        onMouseLeave={clearHint}
                        onClickCapture={(e) => { e.preventDefault(); e.stopPropagation(); clearHint(); openCode() }}
                        dangerouslySetInnerHTML={{ __html: sanitizeHtmlBlock(node.attrs.html) }}
                    />
                ) : (
                    <div className="text-[13px] text-[var(--dash-ink-soft)] border border-dashed border-[var(--dash-line)] rounded-[var(--dash-r-inner)] px-4 py-6 text-center">
                        Empty HTML block. Switch to code view to add markup.
                    </div>
                )}
            </div>
        </NodeViewWrapper>
    )
}

/**
 * THE one cursor-following hint pill (components/LinkToolTip.jsx behavior):
 * portaled to <body>, spring-follows the cursor. It owns its OWN state via an
 * imperative ref API so mousemove re-renders only this tiny component, never
 * the editor tree (that was the lag). Clearing waits 140ms so crossing the
 * gaps between blocks does not blink the pill; scroll or a real leave hides
 * it for good.
 */
function HtmlHintTip({ apiRef }) {
    const [hint, setHint] = useState(null)
    const hideTimer = useRef(null)

    useEffect(() => {
        apiRef.current = {
            move: (x, y) => {
                clearTimeout(hideTimer.current)
                setHint({ x, y })
            },
            clear: (instant) => {
                clearTimeout(hideTimer.current)
                if (instant) setHint(null)
                else hideTimer.current = setTimeout(() => setHint(null), 140)
            },
        }
        return () => {
            apiRef.current = null
            clearTimeout(hideTimer.current)
        }
    }, [apiRef])

    useEffect(() => {
        if (!hint) return undefined
        const clear = () => setHint(null)
        window.addEventListener('scroll', clear, true)
        return () => window.removeEventListener('scroll', clear, true)
    }, [hint])

    if (typeof document === 'undefined') return null
    const clampX = (x) => Math.min(Math.max(8, x + 14), (window.innerWidth || 1200) - 380)
    const clampY = (y) => Math.min(y + 18, (window.innerHeight || 800) - 56)
    return createPortal(
        <AnimatePresence>
            {hint && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.7, x: clampX(hint.x) - 40, y: clampY(hint.y) }}
                    animate={{ opacity: 1, scale: 1, x: clampX(hint.x), y: clampY(hint.y) }}
                    exit={{ opacity: 0, scale: 0.7, transition: swapExit }}
                    transition={{ type: 'spring', stiffness: 400, damping: 50 }}
                    className="dash-scrim glass-warm fixed z-[60] flex items-center gap-2.5 rounded-full pl-4 pr-1.5 py-1.5 whitespace-nowrap shadow-[var(--dash-shadow-float)] shadow-md border border-white/40 pointer-events-none"
                    style={{ left: 0, top: 0 }}
                >
                    <span className="text-[12px] text-[var(--dash-ink-soft)]">
                        This section is raw HTML and is edited as code
                    </span>
                    <button
                        type="button"
                        tabIndex={-1}
                        className="dash-hoverable rounded-full bg-black text-white px-3 py-1 text-[12px] font-medium cursor-pointer active:scale-[0.97]"
                    >
                        Open code view
                    </button>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body,
    )
}

/** Apple-style segmented switch between the writing surface and code view. */
function ModeSwitch({ mode, onChange }) {
    return (
        <div className="glass-warm inline-flex items-center rounded-full p-1" role="tablist" aria-label="Editor view">
            {[
                { key: 'write', label: 'Write', icon: <IoNewspaperEmpty /> },
                { key: 'code', label: 'Code', icon: <LuCode size={13} aria-hidden /> },
            ].map((seg) => {
                const active = mode === seg.key
                return (
                    <button
                        key={seg.key}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => onChange(seg.key)}
                        className="relative rounded-full px-3.5 h-7 text-[12px] font-medium cursor-pointer"
                    >
                        {active && (
                            <motion.span
                                layoutId="editor-mode-thumb"
                                transition={sheet}
                                className="absolute inset-0 rounded-full bg-[var(--dash-ink)]"
                                aria-hidden
                            />
                        )}
                        <span className={`relative z-10 flex items-center gap-1.5 ${active ? 'text-[var(--dash-canvas)]' : 'text-[var(--dash-ink-soft)]'}`}>
                            {seg.icon}
                            {seg.label}
                        </span>
                    </button>
                )
            })}
        </div>
    )
}

// Tiny pen glyph for the Write segment (avoids another icon-set import).
function IoNewspaperEmpty() {
    return <span aria-hidden className="text-[13px] leading-none">✎</span>
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
    // Whole-article code view (client directive): 'write' is the rich
    // surface, 'code' is ONE CodeMirror holding the full article HTML.
    const [mode, setMode] = useState('write')
    const [codeDraft, setCodeDraft] = useState('')
    const [langExtensions, setLangExtensions] = useState(null)
    const codeSyncTimer = useRef(null)
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

    // @codemirror/lang-html rides with the code view, not the admin bundle.
    useEffect(() => {
        if (mode !== 'code' || langExtensions) return undefined
        let cancelled = false
        import('@codemirror/lang-html').then((m) => {
            if (!cancelled) setLangExtensions([m.html({ autoCloseTags: true, matchClosingTags: true })])
        })
        return () => { cancelled = true }
    }, [mode, langExtensions])

    // Full-article HTML -> segmented doc, applied to the live editor (fires
    // onUpdate, so autosave and Save always see the code edits).
    const commitCode = useCallback((html) => {
        if (!editor) return
        const body = new DOMParser().parseFromString(String(html ?? ''), 'text/html').body
        const nodes = segmentBody(body, (chunk) => generateJSON(chunk, extensions))
        editor.commands.setContent(
            { type: 'doc', content: nodes.length > 0 ? nodes : [{ type: 'paragraph' }] },
            { emitUpdate: true },
        )
    }, [editor])

    // The ONE shared hover pill for HTML blocks. State lives inside
    // HtmlHintTip (imperative API): mousemove never re-renders the editor.
    const hintApi = useRef(null)
    const moveHint = useCallback((x, y) => hintApi.current?.move(x, y), [])
    const clearHint = useCallback(() => hintApi.current?.clear(), [])

    const switchMode = useCallback(async (next) => {
        if (!editor || next === mode) return
        hintApi.current?.clear(true)
        if (next === 'code') {
            // The article's real HTML, built STRAIGHT from the doc JSON:
            // htmlBlock markup passes through verbatim (no serializer
            // escaping round trip), pretty-printed for humans.
            const raw = docToArticleHtml(editor.getJSON(), (d) => generateHTML(d, extensions))
            let pretty = raw
            try {
                const jsb = await import('js-beautify')
                const beautify = jsb.html || jsb.default?.html
                if (beautify) {
                    pretty = beautify(raw, {
                        indent_size: 2,
                        wrap_line_length: 0,
                        preserve_newlines: true,
                        max_preserve_newlines: 1,
                    })
                }
            } catch { /* formatter unavailable: show raw source */ }
            setCodeDraft(pretty)
            setMode('code')
        } else {
            clearTimeout(codeSyncTimer.current)
            commitCode(codeDraft)
            setMode('write')
        }
    }, [editor, mode, codeDraft, commitCode])

    // Debounced live sync while typing code, so hitting Save without
    // flipping back to Write still saves what the code view shows.
    const onCodeChange = useCallback((v) => {
        const next = v ?? ''
        setCodeDraft(next)
        clearTimeout(codeSyncTimer.current)
        codeSyncTimer.current = setTimeout(() => commitCode(next), 900)
    }, [commitCode])
    useEffect(() => () => clearTimeout(codeSyncTimer.current), [])

    const openCode = useCallback(() => { switchMode('code') }, [switchMode])

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
        <CodeModeContext.Provider value={{ openCode, moveHint, clearHint }}>
        <div>
            {/* Write ⇄ Code, always within reach while scrolling. */}
            <div className="sticky top-16 z-30 flex justify-end pointer-events-none -mb-8">
                <div className="pointer-events-auto">
                    <ModeSwitch mode={mode} onChange={switchMode} />
                </div>
            </div>

            {mode === 'write' && (
            <>
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
            </>
            )}

            {/* Grows with the page until very long, then scrolls internally.
                The rich surface stays mounted in code mode (hidden) so the
                editor instance, history and autosave plumbing survive. */}
            <div className={`max-h-[300vh] dash-scroll ${mode === 'code' ? 'hidden' : ''}`}>
                <EditorContent editor={editor} />
            </div>
            {mode === 'code' && (
                <div className="mt-10 rounded-[var(--dash-r-inner)] overflow-hidden text-[13px] shadow-[var(--dash-shadow-card)] [&_.cm-editor]:outline-none [&_.cm-scroller]:font-mono [&_.cm-content]:!py-5 [&_.cm-content]:!pr-5 [&_.cm-content]:!pl-3 [&_.cm-gutters]:!pl-2 [&_.cm-gutters]:!pr-1 [&_.cm-scroller]:leading-relaxed">
                    <CodeMirror
                        value={codeDraft}
                        onChange={onCodeChange}
                        extensions={langExtensions || []}
                        theme={oneDark}
                        minHeight="60vh"
                        basicSetup={{
                            lineNumbers: true,
                            foldGutter: true,
                            highlightActiveLine: true,
                            bracketMatching: true,
                            closeBrackets: true,
                            autocompletion: true,
                            indentOnInput: true,
                        }}
                        aria-label="Article HTML source"
                    />
                </div>
            )}
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
        <HtmlHintTip apiRef={hintApi} />
        </CodeModeContext.Provider>
    )
}
