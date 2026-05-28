# Proposal: Server-Side Geometry Verification for Quotes (backlog — security)

> Status: backlog (security hardening). Flagged from `add-instant-quoting-engine`:
> `app/api/quote/route.js` and `lib/quoting/quoteRequest.js` carry SECURITY NOTEs
> at the exact points this work plugs in.

## Why

The instant quote is computed from geometry **metrics** (volume, dimensions) that
are currently **computed on the client** and sent to the API. Pricing config is
server-authoritative (the client can't set the price), but a malicious client
could send an understated `volumeCm3` to obtain a cheaper quote and then pay that
lower amount. For previews this is harmless; for a **persisted, payable** quote it
is a real underpayment risk.

## What Changes

- When persisting/finalizing a quote for payment, the server SHALL recompute the
  geometry metrics from the **stored model file** (S3) rather than trusting the
  client: fetch the model by `modelFile.s3Key`, parse it server-side (three.js
  loaders run under Node), and run `computeGeometryMetrics` on the server.
- Reject/flag quotes where client-supplied metrics deviate beyond a tolerance
  from the server-computed values.
- Keep the client-side computation for the instant *preview* (fast UX); the
  server value is authoritative at checkout.

## Impact / Considerations

- **Code:** `app/api/quote/route.js` (recompute before persist),
  a server-side adapter mirroring `lib/quoting/threeGeometryAdapter.js`, S3 fetch.
- **Performance/infra:** parsing large meshes server-side adds latency and memory;
  may warrant a worker/queue or size caps. Could combine with
  `add-slicer-accurate-estimation`.
- **Risk if not done:** underpayment via metric tampering on paid custom prints.
  Prioritize before enabling generic pay-first checkout at scale
  (`add-generic-print-presets`).
