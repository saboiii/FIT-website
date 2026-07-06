// Every blog post is TipTap ('tiptap' + contentJson) — the legacy 'markdown'
// format is retired. This module normalizes ANY inbound content shape on the
// write path, so imports posting markdown or raw HTML can never resurrect the
// legacy editor:
//   - tiptap + contentJson       -> passthrough
//   - raw HTML string            -> SEGMENTED doc: top-level text blocks
//     (p, h1-h6, lists, blockquote, pre, hr) with only simple inline content
//     become real editable TipTap nodes; everything complex (styled sections,
//     divs, buttons) stays an opaque htmlBlock per top-level element, so one
//     backspace deletes one section, never the whole post
//   - markdown string            -> markdown -> HTML -> real TipTap nodes
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import { generateJSON } from '@tiptap/html/server'
import { Window } from 'happy-dom'
import { buildHtmlBlockDoc } from './htmlBlock.js'
import { tiptapExtensions } from './renderTiptap.js'

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] }

const md = unified().use(remarkParse).use(remarkRehype).use(rehypeStringify)

export function markdownToHtml(source) {
    return String(md.processSync(String(source ?? '')))
}

// Structural tags the TipTap schema models as real nodes.
const SIMPLE_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'BLOCKQUOTE', 'HR', 'PRE'])
// What may appear INSIDE a simple block for it to stay fully editable:
// inline formatting plus list internals. Anything else (div, button, table,
// iframe, svg...) marks the whole top-level element as complex.
const ALLOWED_DESCENDANTS = new Set([
    'A', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'STRIKE', 'SPAN', 'MARK', 'CODE',
    'BR', 'LI', 'UL', 'OL', 'P', 'IMG', 'SUB', 'SUP', 'SMALL',
])

function isSimpleBlock(el) {
    if (!SIMPLE_TAGS.has(el.tagName)) return false
    for (const child of el.querySelectorAll('*')) {
        if (!ALLOWED_DESCENDANTS.has(child.tagName)) return false
    }
    return true
}

const escapeText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/**
 * Split raw HTML into a mixed TipTap doc: runs of simple text blocks are
 * parsed into native nodes (editable in the modern editor; unsupported inline
 * styles are dropped by the schema — the editability trade-off the client
 * chose); each complex top-level element becomes its own htmlBlock, preserved
 * via the parser's serialization (DOM-equivalent to the source).
 */
export function htmlToSegmentedDoc(html) {
    const window = new Window()
    try {
        window.document.body.innerHTML = String(html ?? '')
        const nodes = []
        let run = [] // consecutive simple-block HTML strings
        const flush = () => {
            if (run.length === 0) return
            const json = generateJSON(run.join(''), tiptapExtensions)
            if (Array.isArray(json?.content)) nodes.push(...json.content)
            run = []
        }
        for (const child of [...window.document.body.childNodes]) {
            if (child.nodeType === 3) {
                const text = String(child.textContent || '').trim()
                if (text) run.push(`<p>${escapeText(text)}</p>`)
                continue
            }
            if (child.nodeType !== 1) continue
            if (isSimpleBlock(child)) {
                run.push(child.outerHTML)
            } else {
                flush()
                nodes.push({ type: 'htmlBlock', attrs: { html: child.outerHTML } })
            }
        }
        flush()
        if (nodes.length === 0) return EMPTY_DOC
        return { type: 'doc', content: nodes }
    } finally {
        window.close()
    }
}

export function normalizeToTiptap({ contentFormat, contentJson, content } = {}) {
    if (contentFormat === 'tiptap' && contentJson && typeof contentJson === 'object') {
        return { contentFormat: 'tiptap', contentJson }
    }
    const src = String(content ?? '')
    if (!src.trim()) return { contentFormat: 'tiptap', contentJson: EMPTY_DOC }
    if (src.trimStart().startsWith('<')) {
        return { contentFormat: 'tiptap', contentJson: htmlToSegmentedDoc(src) }
    }
    return { contentFormat: 'tiptap', contentJson: generateJSON(markdownToHtml(src), tiptapExtensions) }
}

export { buildHtmlBlockDoc }
