/**
 * Sanitize a client-supplied filename for use as the trailing part of an S3
 * object key (`models/<ts>-<rand>-<name>`). Pure. Keeps the human-readable name
 * and extension, but never path segments, control characters, or unbounded
 * length. S3 keys are flat so this is hygiene rather than traversal defence --
 * it keeps prefix-scoped tooling and download naming predictable.
 */
const MAX_LENGTH = 120
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g

export function sanitizeKeyPart(filename) {
  const raw = String(filename ?? '')
  // Last path segment only (handles both / and \ separators)
  const base = raw.split(/[/\\]/).pop() || ''
  const cleaned = base
    .replace(CONTROL_CHARS, '')
    .replace(/^\.+/, '') // no leading dots (hidden/relative-looking names)
    .trim()
  if (!cleaned) return 'file'
  if (cleaned.length <= MAX_LENGTH) return cleaned
  // Cap length but keep the extension so format detection still works
  const dot = cleaned.lastIndexOf('.')
  const ext = dot > 0 ? cleaned.slice(dot) : ''
  return cleaned.slice(0, MAX_LENGTH - ext.length) + ext
}
