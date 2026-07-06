import { describe, it, expect } from 'vitest'
import { Editor } from '@tiptap/core'
import { generateHTML, generateJSON } from '@tiptap/html/server'
import { HtmlBlock, buildHtmlBlockDoc, sanitizeHtmlBlock, injectHtmlBlocks } from '@/lib/blog/htmlBlock'
import { renderTiptapHtml, tiptapExtensions } from '@/lib/blog/renderTiptap'

// Representative of the 46 imported legacy posts: inline styles, buttons,
// pre-escaped entities, quotes of both kinds, and newlines.
const legacyHtml = [
  '<section style="background:#f4f4f4;padding:24px" class="hero">',
  '  <h2 style="color:red">Print &amp; Go</h2>',
  '  <p>He said "hello" and \'goodbye\' &lt;literally&gt; &nbsp; a=1&b=2</p>',
  '  <a href="/quote?x=1&y=2" class="btn" style="border-radius:9999px">Get a quote</a>',
  '</section>',
].join('\n')

describe('buildHtmlBlockDoc', () => {
  it('wraps raw HTML in a single-node tiptap doc', () => {
    expect(buildHtmlBlockDoc('<p>x</p>')).toEqual({
      type: 'doc',
      content: [{ type: 'htmlBlock', attrs: { html: '<p>x</p>' } }],
    })
  })
  it('coerces non-strings to an empty block', () => {
    expect(buildHtmlBlockDoc(null).content[0].attrs.html).toBe('')
    expect(buildHtmlBlockDoc(undefined).content[0].attrs.html).toBe('')
  })
})

describe('renderTiptapHtml with htmlBlock', () => {
  it('renders legacy HTML byte-preserved inside a data-html-block div', () => {
    const html = renderTiptapHtml(buildHtmlBlockDoc(legacyHtml))
    expect(html).toBe(`<div data-html-block="">${legacyHtml}</div>`)
  })

  it('preserves order and content in a mixed doc with multiple blocks', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'htmlBlock', attrs: { html: '<section id="a">first</section>' } },
        { type: 'paragraph', content: [{ type: 'text', text: 'in between' }] },
        { type: 'htmlBlock', attrs: { html: '<section id="b">second</section>' } },
      ],
    }
    expect(renderTiptapHtml(doc)).toBe(
      '<div data-html-block=""><section id="a">first</section></div>'
      + '<p>in between</p>'
      + '<div data-html-block=""><section id="b">second</section></div>',
    )
  })

  it('strips script elements and on* handler attributes', () => {
    const html = renderTiptapHtml(buildHtmlBlockDoc(
      '<div><script>alert(1)</script><script src="https://evil/x.js"></script>'
      + '<img src="x.png" onerror="alert(1)" alt="ok">'
      + '<button style="color:red" ONCLICK=\'run()\' onmouseover=go>Click</button></div>',
    ))
    expect(html).not.toContain('<script')
    expect(html).not.toContain('alert(1)')
    expect(html).not.toContain('onerror')
    expect(html.toLowerCase()).not.toContain('onclick')
    expect(html).not.toContain('onmouseover')
    // The rest of the markup survives the strip.
    expect(html).toContain('<img src="x.png"')
    expect(html).toContain('alt="ok"')
    expect(html).toContain('<button style="color:red"')
    expect(html).toContain('>Click</button>')
  })

  it('renders normal tiptap docs unchanged', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Hello' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'World of printing.' }] },
      ],
    }
    expect(renderTiptapHtml(doc)).toBe(generateHTML(doc, tiptapExtensions))
    expect(renderTiptapHtml(doc)).toContain('<h2>Hello</h2>')
    expect(renderTiptapHtml(doc)).not.toContain('data-html-block')
  })

  it('does not mistake escaped user text for a placeholder', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{ type: 'text', text: '<div data-html-block="" data-html="x"></div>' }],
      }],
    }
    const html = renderTiptapHtml(doc)
    expect(html).toContain('&lt;div data-html-block=')
    expect(html).not.toContain('<div data-html-block=""')
  })

  it('renders an empty htmlBlock as an empty wrapper', () => {
    expect(renderTiptapHtml(buildHtmlBlockDoc(''))).toBe('<div data-html-block=""></div>')
  })
})

describe('htmlBlock parseHTML round trip', () => {
  it('recovers the exact html attr from the serialized data-html form', () => {
    const doc = buildHtmlBlockDoc(legacyHtml)
    const placeholderHtml = generateHTML(doc, tiptapExtensions)
    const parsed = generateJSON(placeholderHtml, tiptapExtensions)
    expect(parsed.content[0].type).toBe('htmlBlock')
    expect(parsed.content[0].attrs.html).toBe(legacyHtml)
  })

  it('recovers the node from the final rendered article form via innerHTML', () => {
    const rendered = renderTiptapHtml(buildHtmlBlockDoc(legacyHtml))
    const parsed = generateJSON(rendered, tiptapExtensions)
    expect(parsed.content[0].type).toBe('htmlBlock')
    expect(parsed.content[0].attrs.html).toContain('Get a quote')
    expect(parsed.content[0].attrs.html).toContain('style="color:red"')
  })
})

describe('editor opacity of the html attr', () => {
  it('loads and re-emits a large html attr through the editor without mangling', () => {
    // ~350KB of gnarly markup: the attr must pass through ProseMirror as an
    // opaque string, never re-parsed by the schema.
    const big = Array(2000).fill(legacyHtml).join('\n<hr>\n')
    const editor = new Editor({
      element: document.createElement('div'),
      extensions: tiptapExtensions,
      content: buildHtmlBlockDoc(big),
    })
    try {
      const json = editor.getJSON()
      expect(json.content[0].type).toBe('htmlBlock')
      expect(json.content[0].attrs.html).toBe(big)
    } finally {
      editor.destroy()
    }
  })
})

describe('sanitizeHtmlBlock', () => {
  it('keeps styles, classes and hrefs intact', () => {
    expect(sanitizeHtmlBlock(legacyHtml)).toBe(legacyHtml)
  })
  it('handles nullish input', () => {
    expect(sanitizeHtmlBlock(null)).toBe('')
    expect(sanitizeHtmlBlock(undefined)).toBe('')
  })
  it('removes unterminated script tags', () => {
    expect(sanitizeHtmlBlock('<p>a</p><script defer src="x">')).toBe('<p>a</p>')
  })
})

describe('injectHtmlBlocks', () => {
  it('is a no-op on html without placeholders', () => {
    const html = '<h2>Hello</h2><p>plain</p>'
    expect(injectHtmlBlocks(html)).toBe(html)
    expect(injectHtmlBlocks('')).toBe('')
  })
})
