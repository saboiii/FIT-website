# Delta for instant-quoting-engine — server-side geometry verification

## ADDED Requirements

### Requirement: Server-side geometry verification on persist
When persisting a quote for a request whose stored model file is in a supported
format (STL, OBJ, glTF/GLB with embedded buffers, 3MF), the system SHALL
recompute the geometry metrics server-side from the stored model bytes and price
the persisted quote from the server-computed volume and dimensions. Client-sent
metrics are used for the live preview only. Source units mirror the client
adapter: STL/OBJ/3MF in millimetres (3MF scaled by its `unit` attribute),
glTF/GLB in metres.

#### Scenario: Server recompute overrides understated client metrics
- GIVEN a persisted quote request whose stored model is a 10 mm cube STL
- AND a client-sent `volumeCm3` that understates the real volume
- WHEN the quote is persisted
- THEN the persisted quote is priced from the server-recomputed 1 cm³ volume

#### Scenario: Each supported format recomputes to the same cube volume
- GIVEN the same 1 cm³ cube stored as STL, OBJ, GLB, and 3MF
- WHEN `recomputeMetricsFromModel` runs on each
- THEN each yields volumeCm3 ≈ 1 and watertight = true

#### Scenario: Unsupported or unparseable model falls back to client metrics
- GIVEN a stored model in an unsupported format (e.g. FBX) or a corrupt file,
  or a glTF using features the server parser does not support (external .bin,
  Draco compression, sparse accessors)
- WHEN the quote is persisted
- THEN the recompute returns null and the client-derived quote is persisted
- AND the save never fails because of the recompute

#### Scenario: Oversized stored models are skipped
- GIVEN a stored model larger than the recompute size cap (75 MB)
- WHEN the quote is persisted
- THEN the server skips the recompute (logging a warning) and persists the
  client-derived quote

### Requirement: Geometry deviation logging
When the server recompute succeeds and the client-sent volume understates the
server-computed volume by more than the tolerance (default 10%), the system
SHALL log a suspicious-deviation event including the request id, both volumes,
and the percentage delta. The server value SHALL still win. (Whether to also
reject such requests is an open product decision —
`decide-geometry-deviation-policy`.)

#### Scenario: Suspicious lowball is logged
- GIVEN a client volume more than 10% below the server-recomputed volume
- WHEN the persisted quote is built
- THEN a deviation event is logged with request id, client volume, server
  volume, and delta
- AND the persisted quote uses the server volume

## MODIFIED Requirements

### Requirement: Geometry-derived metrics
The system SHALL compute, from an uploaded model's geometry, the solid volume
(cm³) and axis-aligned bounding-box dimensions (cm), converting source units
(mm for STL/3MF/OBJ, m for glTF/GLB, honouring scene scale) to centimetres, and
SHALL report whether the mesh is watertight/manifold.

#### Scenario: Volume of a unit cube
- GIVEN a 1×1×1 cm cube geometry
- WHEN volume is computed
- THEN the volume is 1 cm³ (within floating-point tolerance)
- AND the bounding box is 1×1×1 cm

#### Scenario: Non-manifold model falls back
- GIVEN a non-watertight (non-manifold) mesh
- WHEN metrics are computed
- THEN the engine uses a bounding-box volume estimate
- AND marks the quote confidence as `low`

#### Scenario: Empty or degenerate geometry
- GIVEN a geometry with no faces
- WHEN volume is computed
- THEN the volume is 0
