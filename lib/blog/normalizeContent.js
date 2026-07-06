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
import { buildHtmlBlockDoc, segmentBody } from './htmlBlock.js'
import { tiptapExtensions } from './renderTiptap.js'

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] }

const md = unified().use(remarkParse).use(remarkRehype).use(rehypeStringify)

export function markdownToHtml(source) {
    return String(md.processSync(String(source ?? '')))
}

/**
 * Split raw HTML into a mixed TipTap doc: runs of simple text blocks are
 * parsed into native nodes (editable in the modern editor; unsupported inline
 * styles are dropped by the schema — the editability trade-off the client
 * chose); each complex top-level element becomes its own htmlBlock, preserved
 * via the parser's serialization (DOM-equivalent to the source). The shared
 * walk lives in htmlBlock.js — the editor runs the same one client-side with
 * DOMParser for its whole-article code view.
 */
export function htmlToSegmentedDoc(html) {
    const window = new Window()
    try {
        window.document.body.innerHTML = String(html ?? '')
        const nodes = segmentBody(window.document.body, (chunk) => generateJSON(chunk, tiptapExtensions))
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
