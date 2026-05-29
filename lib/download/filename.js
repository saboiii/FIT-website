/**
 * Resolve a safe download filename for proxied files. Pure + dependency-free.
 *
 * Goals: never serve a file named after the route ("proxy") or without an
 * extension, and never let a caller-supplied name inject into the
 * Content-Disposition header or traverse paths.
 */

const EXT_RE = /\.[a-z0-9]{1,8}$/i

/** Strip path separators, quotes, and control/CRLF chars (header injection). */
export function sanitizeFilename(name) {
  return String(name ?? '')
    .replace(/[\r\n]/g, '')
    .replace(/[\\/]/g, '')
    .replace(/["']/g, '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f\x7f]/g, '')
    .trim()
}

export function hasExtension(name) {
  return EXT_RE.test(name)
}

/**
 * @param {{requested?:string, s3Key?:string, fallbackExt?:string}} args
 * @returns {string} a sanitised filename guaranteed to have an extension
 */
export function resolveDownloadFilename({ requested, s3Key, fallbackExt = 'stl' } = {}) {
  const req = sanitizeFilename(requested)
  if (req && hasExtension(req)) return req

  const base = sanitizeFilename(String(s3Key ?? '').split('/').pop() || '')
  if (base && hasExtension(base)) return base

  const stem = req || base || 'model'
  return `${stem}.${fallbackExt}`
}
