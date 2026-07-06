// Write-path content normalization: the legacy 'markdown' format is retired,
// every inbound shape becomes TipTap (lib/blog/normalizeContent).
import { describe, it, expect } from 'vitest'
import { normalizeToTiptap, markdownToHtml } from '@/lib/blog/normalizeContent'
import { renderTiptapHtml } from '@/lib/blog/renderTiptap'

describe('normalizeToTiptap', () => {
    it('passes real tiptap docs through untouched', () => {
        const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hi' }] }] }
        const out = normalizeToTiptap({ contentFormat: 'tiptap', contentJson: doc })
        expect(out.contentJson).toBe(doc)
        expect(out.contentFormat).toBe('tiptap')
    })

    it('wraps raw HTML content in one byte-preserving htmlBlock', () => {
        const html = '<section style="color:#111"><h2>Guide</h2><p>Step 1</p></section>'
        const out = normalizeToTiptap({ contentFormat: 'markdown', content: html })
        expect(out.contentJson.content).toHaveLength(1)
        expect(out.contentJson.content[0].type).toBe('htmlBlock')
        expect(renderTiptapHtml(out.contentJson)).toContain(html)
    })

    it('converts genuine markdown into real editable TipTap nodes', () => {
        const out = normalizeToTiptap({ contentFormat: 'markdown', content: '# Title\n\nSome **bold** text\n\n- one\n- two' })
        const types = out.contentJson.content.map((n) => n.type)
        expect(types).toContain('heading')
        expect(types).toContain('bulletList')
        const rendered = renderTiptapHtml(out.contentJson)
        expect(rendered).toContain('<h1>')
        expect(rendered).toContain('<strong>bold</strong>')
        expect(rendered).toContain('<li>')
    })

    it('yields an empty doc for empty content', () => {
        const out = normalizeToTiptap({ contentFormat: 'markdown', content: '   ' })
        expect(out.contentJson.type).toBe('doc')
    })

    it('markdownToHtml renders basic syntax', () => {
        expect(markdownToHtml('## Hey')).toContain('<h2>Hey</h2>')
    })
})
