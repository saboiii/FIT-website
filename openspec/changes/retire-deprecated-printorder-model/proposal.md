# Proposal: Retire Deprecated PrintOrder Model (tech debt)

> Status: **partially done 2026-05-29.** Dead files removed; the `PrintOrder`
> model removal itself stays deferred (it is still live).

## Done (2026-05-29)

- Removed the stray `app/api/product/route.js.bak`.
- Removed the dead `/api/print-config` routes — `route.js` (unused in-memory
  `Map`) and `[orderId]/route.js` (read the deprecated model). Confirmed zero
  internal callers.

## Remaining (DEFERRED — needs migration + data audit)

`PrintOrder` is **still live**: imported by `app/api/webhook/stripe/route.js`,
`app/api/user/checkout/route.js`, and `app/api/user/print-order/*`. Removing it
means migrating the direct print-order flow to `CustomPrintRequest` and a data
audit/migration of historical `PrintOrder` documents — this touches the live
payment/webhook path, so it must be done deliberately (and likely verified
against real Stripe events), not as a drive-by deletion.

## Why

`models/PrintOrder.js` is documented as **deprecated** in favour of
`CustomPrintRequest`, but it is still present and its fields duplicate the newer
model. Carrying two overlapping models invites drift (fields fixed in one but not
the other) and confuses new contributors about the source of truth. Stray
artifacts like `app/api/product/route.js.bak` add similar noise.

## What Changes

- Confirm no live code path still writes/reads `PrintOrder` (migrate any that do
  to `CustomPrintRequest`).
- Migrate/verify any historical `PrintOrder` data, then remove the model and its
  routes.
- Remove the dead `/api/print-config` routes: `route.js` (unused in-memory `Map`
  store) and `[orderId]/route.js` (reads the deprecated `PrintOrder`). Confirmed
  zero internal callers — see `fix-print-config-in-memory-store`. Pending
  confirmation of no external callers.
- Remove stray backup files (e.g. `*.bak`).

## Impact

- **Specs:** none (no behavioural change intended) — cleanup only.
- **Code:** delete `models/PrintOrder.js` and dependent routes once unused;
  remove `*.bak` files.
- **Risk:** medium — must verify there is no remaining read/write and no
  historical data still needed before deletion; do it behind a data audit.
