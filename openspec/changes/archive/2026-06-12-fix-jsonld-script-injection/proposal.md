# Proposal: Escape JSON-LD Script Blocks (XSS hardening)

> Status: **COMPLETE 2026-06-12** (archived). Found during a full-codebase security scan.

## Why

Six pages render SEO structured data with
`dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}`. Two of them
(`app/products/[slug]/page.jsx`, `app/blog/[blogSlug]/page.jsx`) build that
object from database content (product/blog titles, descriptions). A stored
string containing `</script><script>...` terminates the JSON-LD block and
executes attacker-controlled script in the storefront (stored XSS; reachable by
whoever can author products/blogs — admin-authored today, but defence in depth
is one line). The standard fix is escaping `<` as `\u003c` inside the JSON,
which browsers parse identically.

## What Changes

- `lib/jsonLd.js` — `jsonLdString(data)`: `JSON.stringify` + `<` → `\u003c`
  (pure, tested).
- All six call sites use it (uniform, so future copy-paste stays safe).

## Impact

- **Specs:** none (rendering hygiene; no behavioural requirement changes).
- **Code:** `lib/jsonLd.js`, six page components, unit test.
- **Risk:** none — `\u003c` is valid JSON and decodes to the same string.
