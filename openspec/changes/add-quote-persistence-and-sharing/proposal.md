# Proposal: Saved & Shareable Quotes (future)

> Status: backlog. Depends on `add-instant-quoting-engine`.

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
