# Proposal: Decide Rejection Policy for Suspicious Geometry Deviation (backlog)

> Status: backlog — **BLOCKED on a product decision.** Spun out of
> `add-server-side-geometry-verification` (task 3.4) so that change could be
> archived with its delivered scope.

## Why

`POST /api/quote` now recomputes geometry server-side from the stored model
(STL/OBJ/glTF/GLB/3MF) when persisting a quote. When the client-sent volume
understates the server recompute by more than the tolerance (10%), the API logs
a `[quote] geometry deviation` line via `console.error` and the server value
wins. The open question is whether a suspicious deviation should also **fail the
request (HTTP 400)** instead of silently persisting the corrected quote.

Arguments either way:

- **Reject:** an understated volume beyond tolerance is a strong tamper signal;
  failing loudly deters probing and avoids quoting interactions with a hostile
  client at all.
- **Log-only (current):** legitimate divergence exists (client three.js loaders
  vs server parsers on edge-case meshes, non-watertight fallbacks); rejecting
  would turn a parser disagreement into a customer-facing error. The server
  price already wins, so there is no underpayment risk either way.

## What Changes (once decided)

- If "reject": return 400 with a safe error message when
  `geometryDeviation(...).suspicious` is true in the persist path; add a spec
  scenario + tests; consider an ops allowlist/threshold config in
  `AppSettings.quotingConfig`.
- If "log-only": close this change recording the decision; optionally promote
  the log to a structured metric for monitoring.

## Impact

- **Decision owner:** product/ops (needs real-world deviation data — watch the
  logs from `add-server-side-geometry-verification` first).
- **Code:** `app/api/quote/route.js` (one branch), tests.
- **Risk:** low; the underpayment vector is already closed because the server
  recompute wins regardless.
