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

describe('htmlToSegmentedDoc', () => {
    it('splits top-level content: plain text blocks become editable nodes, complex ones stay htmlBlocks', async () => {
        const { htmlToSegmentedDoc } = await import('@/lib/blog/normalizeContent')
        const html = '<h2>Editable heading</h2><p>Editable <strong>text</strong></p>'
            + '<section style="border:1px solid"><p>Styled designed section</p><button>CTA</button></section>'
            + '<p>Tail paragraph</p>'
        const doc = htmlToSegmentedDoc(html)
        const types = doc.content.map((n) => n.type)
        expect(types).toEqual(['heading', 'paragraph', 'htmlBlock', 'paragraph'])
        expect(doc.content[2].attrs.html).toContain('Styled designed section')
        const rendered = renderTiptapHtml(doc)
        expect(rendered).toContain('<h2>Editable heading</h2>')
        expect(rendered).toContain('<strong>text</strong>')
        expect(rendered).toContain('<button>CTA</button>')
    })

    it('one backspace-sized unit per complex top-level element, never one giant block', async () => {
        const { htmlToSegmentedDoc } = await import('@/lib/blog/normalizeContent')
        const html = '<section><div>A</div></section><section><div>B</div></section><section><div>C</div></section>'
        const doc = htmlToSegmentedDoc(html)
        expect(doc.content).toHaveLength(3)
        expect(doc.content.every((n) => n.type === 'htmlBlock')).toBe(true)
    })
})

describe('code-view round trip', () => {
    it('keeps top-level images as editable image nodes, not html blocks', async () => {
        const { htmlToSegmentedDoc } = await import('@/lib/blog/normalizeContent')
        const doc = htmlToSegmentedDoc('<p>Before</p><img src="/api/proxy?key=x.jpg" alt="pic"><p>After</p>')
        expect(doc.content.map((n) => n.type)).toEqual(['paragraph', 'image', 'paragraph'])
    })
})
