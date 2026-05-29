# Proposal: Saved & Shareable Quotes (future)

> Status: **backend implemented 2026-05-29.** Kept active for the account/share UI
> (browser). Depends on `add-instant-quoting-engine`.

## Done (2026-05-29) — backend

- `lib/quoting/savedQuote.js` (pure, tested) — opaque `generateShareToken`,
  `computeExpiry`, `isExpired`, `isQuoteValid`, `isShareUsable` (validity windows).
- `models/SavedQuote.js` — quoteId, userId, modelRef, settings, server quote
  breakdown, validUntil, sparse-unique shareToken + shareExpiresAt.
- Endpoints (pricing recomputed server-side via `buildQuote`, never trusting the
  client):
  - `POST /api/quote/save` (auth) — compute + save; `GET` lists the user's quotes.
  - `POST /api/quote/:quoteId/share` (auth, owner) — generate/refresh a share link.
  - `GET /api/quote/shared/:token` (public) — read-only quote if the link is
    usable; flags `stale` when the validity window has passed (re-quote).

## Remaining (flagged — browser/UI)

- Account UI: list saved quotes, "Save quote" action in the editor, a share button,
  and a public shared-quote page rendering the breakdown with a "proceed to
  checkout" CTA. See `verify-quoting-flows-browser`.
- Re-quote flow when a shared/saved quote is `stale` (pricing changed).

## Why

Customers often configure a print, leave, and come back; teams want to send a
quote link. Today a quote only lives transiently in the editor until a request is
created. Persisting and sharing quotes improves conversion and supports
quote-then-approve workflows.

## What Changes

- Allow a customer to save a quote (model reference + settings + breakdown) and
  retrieve it later from their account.
- Generate a shareable, read-only quote link (expiring token) that re-renders the
  breakdown and lets the recipient proceed to checkout.
- Quote validity window (re-price if pricing config changed since issue).

## Impact

- **Specs:** adds a `quote-persistence` capability; modifies `instant-quoting-engine`.
- **Code:** a `Quote` model (or reuse `CustomPrintRequest` pre-upload), share-token
  endpoint, account UI list.
- **Risks:** stale pricing on old quotes (mitigate with validity window +
  re-quote), access control on shared links.
