// Pure status helpers. `status` is authoritative on new writes; legacy docs
// only carry the `published` boolean.
export function effectiveStatus(post) {
  if (!post) return 'draft'
  if (post.status) return post.status
  return post.published ? 'published' : 'draft'
}

// Mongo filter matching effectiveStatus() semantics: `status` is authoritative
// when present; legacy docs (no `status` field) fall back to the `published`
// boolean. `{ status: null }` matches both missing and null in MongoDB.
export function statusQuery(status) {
  if (status === 'published') {
    return { $or: [{ status: 'published' }, { status: null, published: true }] }
  }
  if (status === 'draft') {
    return { $or: [{ status: 'draft' }, { status: null, published: { $ne: true } }] }
  }
  if (status === 'hidden') return { status: 'hidden' }
  return {}
}

// Fields to persist for a requested status change (keeps `published` in sync;
// stamps publishDate on first publish).
export function statusWrite(status, existingPublishDate, now = new Date()) {
  const s = ['draft', 'published', 'hidden'].includes(status) ? status : 'draft'
  return {
    status: s,
    published: s === 'published',
    publishDate: s === 'published' ? existingPublishDate || now : existingPublishDate || null,
  }
}
