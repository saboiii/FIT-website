// Pure status helpers. `status` is authoritative on new writes; legacy docs
// only carry the `published` boolean.
export function effectiveStatus(post) {
  if (!post) return 'draft'
  if (post.status) return post.status
  return post.published ? 'published' : 'draft'
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
