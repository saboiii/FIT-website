# Tasks: Server-Side Geometry Verification

## 1. STL recompute (done 2026-05-29)
- [x] 1.1 `lib/quoting/stl.js` — pure binary + ASCII STL parser (tested with a
      synthetic binary cube → 1 cm³).
- [x] 1.2 `lib/quoting/serverGeometry.js` — `recomputeMetricsFromModel(buffer,
      fileName)` for STL (returns null for other formats).
- [x] 1.3 `POST /api/quote` (persist path) fetches the stored model from S3, runs
      the STL recompute, re-runs `buildQuote` with server volume/dims, and falls
      back to the client quote on any failure.

## 2. Deviation logging (done 2026-06-08)
- [x] 2.1 `lib/quoting/geometryDeviation.js` — pure
      `geometryDeviation(client, server, tolerancePct=10)` returning
      `{volumePctDelta, suspicious, tolerancePct}`.
- [x] 2.2 Unit tests for the helper (`tests/unit/geometryDeviation.test.js`).
- [x] 2.3 `/api/quote` logs `console.error` with the requestId, client volume,
      server volume, and the delta when the client lowballs by more than the
      tolerance. (Server volume still wins; logging is the abuse signal.)

## 3. Remaining (flagged)
- [ ] 3.1 Server-side parse for **OBJ** (text format; three.js OBJLoader works in
      Node with minimal setup). Until done, OBJ requests persist the client
      metric.
- [ ] 3.2 Server-side parse for **glTF / GLB** (heavier; needs a Node-compatible
      loader path or `@gltf-transform/core`). Until done, glTF/GLB requests
      persist the client metric.
- [ ] 3.3 Server-side parse for **3MF** (zip+xml format). Until done, 3MF
      requests persist the client metric.
- [ ] 3.4 Decide whether suspicious deviations should fail the request (HTTP
      400) rather than just log + win on server. Needs product input.
- [ ] 3.5 Integration verification against live S3 (browser QA).
