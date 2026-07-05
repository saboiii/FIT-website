/**
 * Serialize structured data (JSON-LD) for embedding in a <script> tag.
 * `<` is escaped as \u003c so database-sourced strings (titles, descriptions)
 * can never terminate the script block (`</script>` breakout / stored XSS).
 * The escape is valid JSON — parsers decode it to the same string.
 */
export function jsonLdString(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
