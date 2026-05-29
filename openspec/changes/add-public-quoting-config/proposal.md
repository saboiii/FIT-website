# Proposal: Customer-Readable Quoting Config (printColours) (backlog)

> Status: backlog. Spun out of `add-generic-print-presets` (task 2.4).

## Why

The editor's generic colour dropdown currently uses the hard-coded
`DEFAULT_PRINT_COLOURS`. Admins can now curate `AppSettings.printColours` (via the
Quoting/Pricing admin UI), but the editor doesn't yet read that — so curated
colours aren't reflected for customers. `/api/admin/settings` is admin-gated, so
the customer-facing editor needs a non-admin way to read the catalogue.

## What Changes

- Add a customer-readable endpoint (e.g. `GET /api/quote/config` or
  `/api/public/print-colours`) returning the `printColours` catalogue (and any
  display-safe quoting info), without exposing admin-only data.
- Editor sources its colour list from that endpoint, falling back to
  `DEFAULT_PRINT_COLOURS` on failure.

## Impact

- **Code:** new public route; `components/Editor/result.jsx` (fetch colours).
- **Security:** expose only non-sensitive catalogue data; do not leak full pricing
  internals beyond what a quote already reveals.
- **Risk:** low.
