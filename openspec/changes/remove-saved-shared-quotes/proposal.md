# Proposal: Remove Saved & Shareable Quotes

> Status: active. Client decision (#19 from manual testing):
> "no need for these features, we don't have to share them or save them."
> Supersedes the previously-active `add-quote-persistence-and-sharing`.

## Why

The previous proposal added a `SavedQuote` model + endpoints for saving and
sharing quotes (`/api/quote/save`, `/api/quote/:id/share`,
`/api/quote/shared/:token`) and a pure share-token/validity core. The client has
decided the storefront does not need this — quotes are computed live in the
editor (instant) or assigned by an admin (manual), and customers do not share
or persist them. Carrying the backend around (and the corresponding account UI
that was still pending) is dead weight and a needless attack surface.

## What Changes

- Delete `models/SavedQuote.js`, `lib/quoting/savedQuote.js`, and
  `tests/unit/savedQuote.test.js`.
- Delete the routes `app/api/quote/save`, `app/api/quote/[quoteId]/share`, and
  `app/api/quote/shared/[token]`.
- Remove the active proposal directory
  `openspec/changes/add-quote-persistence-and-sharing/` (its work is intentionally
  not landing).
- Update `openspec/ROADMAP.md` to mark the capability dropped at client request.

## Impact

- **Specs:** none added/removed (no `quote-persistence` spec was ever folded into
  `openspec/specs/`).
- **Code:** strictly deletes; no other call sites depend on these modules
  (`grep -rln` confirms references are self-contained).
- **Tests:** removes one unit test file; full suite stays green.
- **Risk:** low — pure removal of orphan backend.
