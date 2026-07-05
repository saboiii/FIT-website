// Pure: published posts → RSS 2.0 XML string.
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildRssXml({ title, siteUrl, description, posts = [] }) {
  const items = posts
    .map((p) => {
      const url = `${siteUrl}/blog/${encodeURIComponent(p.slug)}`
      const pubDate = p.publishDate ? new Date(p.publishDate).toUTCString() : ''
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${esc(url)}</link>
      <guid isPermaLink="true">${esc(url)}</guid>
      <description>${esc(p.excerpt || '')}</description>
      ${pubDate ? `<pubDate>${pubDate}</pubDate>` : ''}
    </item>`
    })
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${esc(title)}</title>
    <link>${esc(siteUrl)}/blog</link>
    <description>${esc(description)}</description>
${items}
  </channel>
</rss>`
}
