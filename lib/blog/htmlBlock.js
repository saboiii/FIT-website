// Raw-HTML block node for legacy imported posts whose "markdown" content is
// actually hand-authored HTML (inline styles, buttons, custom layouts). The
// node lets those posts live inside a normal TipTap document without the HTML
// ever being re-parsed through the ProseMirror schema: the markup is stored as
// an opaque string in attrs.html.
//
// Round-trip mechanism (editor <-> JSON <-> server HTML):
// - JSON: the raw HTML string lives in attrs.html and is never interpreted.
// - Editor: TiptapEditor.jsx extends this node with a React NodeView that
//   renders attrs.html read-only (dangerouslySetInnerHTML) and edits it via a
//   plain textarea, so ProseMirror never parses the string.
// - Server render: TipTap/ProseMirror serializers cannot emit raw strings, so
//   renderHTML rides the markup out in an escaped `data-html` attribute:
//     <div data-html-block="" data-html="&lt;section&gt;..."></div>
//   renderTiptapHtml then calls injectHtmlBlocks() to post-process that
//   placeholder back into raw markup:
//     <div data-html-block="">RAW HTML</div>
//   The attribute unescape is the exact inverse of the serializer's attribute
//   escaping (happy-dom escapes only `&` and `"` in double-quoted attribute
//   values), so the round trip is byte-preserving. This is pinned by
//   tests/unit/htmlBlock.test.js; if the serializer's escaping ever changes,
//   those tests fail loudly.
// - parseHTML accepts both forms (`data-html` attribute or raw innerHTML), so
//   pasting either the placeholder or the final rendered article HTML back
//   into the editor recovers the node.
import { Node } from '@tiptap/core'

export const HtmlBlock = Node.create({
  name: 'htmlBlock',
  group: 'block',
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      html: { default: '' },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-html-block]',
        getAttrs: (element) => ({
          html: element.getAttribute('data-html') ?? element.innerHTML ?? '',
        }),
      },
    ]
  },

  renderHTML({ node }) {
    // Placeholder form only; injectHtmlBlocks() turns this into raw markup on
    // the server. See the module comment for the full mechanism.
    return ['div', { 'data-html-block': '', 'data-html': node.attrs.html || '' }]
  },
})

// Conversion entry point for legacy posts: wraps a raw HTML string in a full
// TipTap doc containing a single htmlBlock node.
export function buildHtmlBlockDoc(html) {
  return {
    type: 'doc',
    content: [
      { type: 'htmlBlock', attrs: { html: typeof html === 'string' ? html : '' } },
    ],
  }
}

// Cheap safety floor for admin-authored HTML: strip <script> elements and
// on*= event-handler attributes. Deliberately not a full sanitizer.
export function sanitizeHtmlBlock(html) {
  return String(html || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<\/?script\b[^>]*>/gi, '')
    // Strip on*= handlers tag by tag so multiple handlers in one tag are all
    // caught and plain text mentioning "on...=" is left alone.
    .replace(/<[a-z][^>]*>/gi, (tag) =>
      tag.replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, ''))
}

// Exact inverse of the serializer's attribute escaping (see module comment).
// Order matters: `&quot;` first, `&amp;` last, mirroring escape order.
function unescapeAttributeValue(value) {
  return value.replace(/&quot;/g, '"').replace(/&amp;/g, '&')
}

const RENDERED_BLOCK_RE = /<div data-html-block="" data-html="([^"]*)"><\/div>/g

// Post-processes generateHTML output: replaces every htmlBlock placeholder
// with its raw (sanitized) markup. Safe against false positives because any
// user text resembling the placeholder is entity-escaped by the serializer.
export function injectHtmlBlocks(renderedHtml) {
  return String(renderedHtml || '').replace(RENDERED_BLOCK_RE, (match, escaped) => {
    const raw = sanitizeHtmlBlock(unescapeAttributeValue(escaped))
    return `<div data-html-block="">${raw}</div>`
  })
}

// ---- Segmentation (shared walk; client passes a DOMParser body + the
// browser generateJSON, the server passes a happy-dom body + the server
// generateJSON — see lib/blog/normalizeContent.js and TiptapEditor.jsx) ----

// Structural tags the TipTap schema models as real nodes.
export const SIMPLE_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'BLOCKQUOTE', 'HR', 'PRE', 'IMG'])
// What may appear INSIDE a simple block for it to stay fully editable.
export const ALLOWED_DESCENDANTS = new Set([
  'A', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'STRIKE', 'SPAN', 'MARK', 'CODE',
  'BR', 'LI', 'UL', 'OL', 'P', 'IMG', 'SUB', 'SUP', 'SMALL',
])

const escapeText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function isSimpleBlock(el) {
  if (!SIMPLE_TAGS.has(el.tagName)) return false
  for (const child of el.querySelectorAll('*')) {
    if (!ALLOWED_DESCENDANTS.has(child.tagName)) return false
  }
  return true
}

/**
 * Walk a parsed <body>: runs of simple text blocks become native TipTap nodes
 * via `toJson(html) -> doc JSON`; each complex top-level element becomes its
 * own htmlBlock. Returns the node array for a doc.
 */
export function segmentBody(body, toJson) {
  const nodes = []
  let run = []
  const flush = () => {
    if (run.length === 0) return
    const json = toJson(run.join(''))
    if (Array.isArray(json?.content)) nodes.push(...json.content)
    run = []
  }
  for (const child of [...body.childNodes]) {
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
  return nodes
}
