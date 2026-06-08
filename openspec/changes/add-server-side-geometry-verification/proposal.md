# Proposal: Server-Side Geometry Verification for Quotes (backlog — security)

> Status: **STL recompute (2026-05-29) + deviation logging (2026-06-08) done.**
> Kept active for OBJ / glTF / 3MF recompute, the deviation policy decision, and
> integration verification.

## Done (2026-05-29)

- `lib/quoting/stl.js` — pure binary+ASCII STL parser → positions (tested,
  including a synthetic binary cube → 1 cm³).
- `lib/quoting/serverGeometry.recomputeMetricsFromModel(buffer, fileName)` —
  recomputes volume/dimensions server-side for **STL** (returns null otherwise).
- `POST /api/quote` persist path now fetches the stored model from S3 and, for
  STL, recomputes the quote from server metrics (re-running `buildQuote` with the
  server volume/dims) before persisting + returning it. Best-effort: any failure
  falls back to the client-derived quote so the save never breaks. The live
  preview still uses client metrics.

## Done (2026-06-08) — deviation logging

- `lib/quoting/geometryDeviation.js` — pure
  `geometryDeviation(client, server, tolerancePct = 10)` returning
  `{volumePctDelta, suspicious, tolerancePct}`.
- `/api/quote` logs `console.error` with the requestId, client volume, server
  volume, and the delta when the client lowballs by more than the tolerance.
  The server volume still wins; the log is the abuse signal so ops can spot
  tampering attempts or a real parse-divergence bug.

## Remaining (flagged)

- **Other formats:** server-side parsing for OBJ / glTF / 3MF (heavier; glTF
  especially). Until then those formats persist the client-metric quote.
- **Deviation policy:** currently logged + server-wins. Decide whether to also
  reject (HTTP 400) when deviation exceeds the tolerance. Needs product input.
- **Integration verification:** the S3-fetch + persist path is guarded but was
  not run against live S3 here (see `verify-quoting-flows-browser`).

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
