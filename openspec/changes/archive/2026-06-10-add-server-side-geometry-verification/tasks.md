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

## 3. Remaining formats (done 2026-06-10)
- [x] 3.1 Server-side parse for **OBJ** — `lib/quoting/obj.js`, pure text parser
      (`v` vertices; `f` faces incl. v/vt/vn syntax + negative indices; fan
      triangulation). Treated as mm, matching the client adapter.
- [x] 3.2 Server-side parse for **glTF / GLB** — `lib/quoting/gltf.js`, pure
      parser for GLB containers and .gltf with embedded data-URI buffers; full
      node-transform hierarchy (matrix/TRS); returns null on external buffers,
      Draco/meshopt compression, sparse accessors, or non-triangle modes so the
      caller falls back to client metrics. Metres, matching the client adapter.
- [x] 3.3 Server-side parse for **3MF** — `lib/quoting/threeMf.js` via the
      existing `jszip` dependency; objects + `<component>` composition +
      `<build>` item transforms (row-major 4x3) + model `unit` scaling to mm.
- [x] 3.4 (spun out 2026-06-10) Deviation rejection policy → backlog change
      `decide-geometry-deviation-policy` (product decision; log-only today).
- [x] 3.5 (spun out 2026-06-10) Live-S3 integration verification → folded into
      the `verify-quoting-flows-browser` human QA checklist (item 6).

All formats share `recomputeMetricsFromModel` (now async); the route gates the
S3 fetch on `supportsServerRecompute(fileName)` and skips recompute for stored
models above 75MB (falling back to client metrics). Tests:
`tests/unit/serverGeometryFormats.test.js`, `tests/unit/stl.test.js`.
