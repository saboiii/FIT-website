# Proposal: Explicit Return-To-Origin for the Editor (backlog)

> Status: **implemented 2026-05-29.** `/editor?returnTo=` is validated by
> `utils/safeReturnPath.safeInternalPath` (same-origin only; blocks open-redirects),
> stored, and used for post-save navigation (falls back to context defaults). Spun
> out of `improve-custom-print-post-config-ux` (task 3.1). (Browser verify via
> `verify-quoting-flows-browser`.)

## Why

After saving a config the editor now routes back by **context** (custom print →
`/cart`, direct order → `/account`) via the client router — which is correct for
the current entry points. But if the editor is ever launched from elsewhere (an
account order detail page, a saved-quote link, a deep link), the customer should
return to exactly where they came from.

## What Changes

- Accept an optional `returnTo` search param on `/editor` (validated as a safe
  internal path), store it, and `router.push(returnTo)` after save when present;
  otherwise keep the current context defaults.
- Entry points that want a specific return destination pass `returnTo`.

## Impact

- **Code:** `app/editor/page.jsx` (capture + validate), `components/Editor/result.jsx`
  (use it in submit nav). Validate `returnTo` is a relative internal path (no
  open-redirect).
- **Risk:** low.
