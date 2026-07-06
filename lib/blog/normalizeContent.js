// Every blog post is TipTap ('tiptap' + contentJson) — the legacy 'markdown'
// format is retired. This module normalizes ANY inbound content shape on the
// write path, so imports posting markdown or raw HTML can never resurrect the
// legacy editor:
//   - tiptap + contentJson       -> passthrough
//   - raw HTML string            -> one opaque htmlBlock (byte-preserving)
//   - markdown string            -> markdown -> HTML -> real TipTap nodes
//     (fully editable paragraphs/headings/lists in the modern editor)
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import { generateJSON } from '@tiptap/html/server'
import { buildHtmlBlockDoc } from './htmlBlock.js'
import { tiptapExtensions } from './renderTiptap.js'

const EMPTY_DOC = { type: 'doc', content: [{ type: 'paragraph' }] }

const md = unified().use(remarkParse).use(remarkRehype).use(rehypeStringify)

export function markdownToHtml(source) {
    return String(md.processSync(String(source ?? '')))
}

export function normalizeToTiptap({ contentFormat, contentJson, content } = {}) {
    if (contentFormat === 'tiptap' && contentJson && typeof contentJson === 'object') {
        return { contentFormat: 'tiptap', contentJson }
    }
    const src = String(content ?? '')
    if (!src.trim()) return { contentFormat: 'tiptap', contentJson: EMPTY_DOC }
    if (src.trimStart().startsWith('<')) {
        // Hand-authored HTML stays byte-exact inside an htmlBlock instead of
        // being lossy-parsed through the editor schema.
        return { contentFormat: 'tiptap', contentJson: buildHtmlBlockDoc(src) }
    }
    return { contentFormat: 'tiptap', contentJson: generateJSON(markdownToHtml(src), tiptapExtensions) }
}
