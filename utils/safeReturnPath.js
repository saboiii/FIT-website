/**
 * Validate a `returnTo` redirect target. Only same-origin relative paths are
 * allowed, to prevent open-redirects. Returns the path if safe, else null.
 */
export function safeInternalPath(path) {
  if (typeof path !== 'string' || path.length === 0) return null
  // Must start with a single "/" (relative, same-origin).
  if (!path.startsWith('/')) return null
  // Reject protocol-relative ("//host") and any scheme or backslash tricks.
  if (path.startsWith('//') || path.startsWith('/\\')) return null
  if (/^\/[\\]/.test(path)) return null
  if (path.includes('\\')) return null
  // Reject control chars / whitespace that could smuggle a second URL.
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\s]/.test(path)) return null
  return path
}
