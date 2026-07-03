// Pure: pick related posts — same category first (newest first), padded with
// the most recent others; never the post itself; max `limit`.
export function pickRelated(post, pool, limit = 3) {
  if (!post) return []
  const others = (pool || []).filter((p) => p.slug !== post.slug)
  const cats = new Set(post.categories || [])
  const byDateDesc = (a, b) => new Date(b.publishDate || 0) - new Date(a.publishDate || 0)
  const sameCat = others.filter((p) => (p.categories || []).some((c) => cats.has(c))).sort(byDateDesc)
  const rest = others.filter((p) => !sameCat.includes(p)).sort(byDateDesc)
  return [...sameCat, ...rest].slice(0, limit)
}
