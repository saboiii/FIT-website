# Instant Quoting Engine Specification

## Purpose

Computes a customer-facing, itemized print quote from an uploaded model's
geometry plus print settings and option toggles. Implemented as pure,
dependency-free functions under `lib/quoting/` (geometry → material → time →
quote) so it runs identically in the browser (live preview) and on the server
(authoritative recompute via `POST /api/quote`).

## Requirements

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

### Requirement: Material weight estimate
The system SHALL estimate filament/material weight (grams) from volume, infill
density, wall loops, nozzle diameter, and a per-material density, such that
weight increases monotonically with volume, infill, and density, and approaches
the solid weight (`volume × density`) as infill approaches 100%.

#### Scenario: Infill scales weight
- GIVEN two identical geometries, one at 20% infill and one at 80% infill
- WHEN weight is estimated
- THEN the 80% infill estimate is greater than the 20% infill estimate
- AND neither exceeds the solid weight (`volume × density`)

#### Scenario: Material density matters
- GIVEN identical geometry priced once as PLA and once as a denser material
- WHEN weight is estimated
- THEN the denser material yields a greater weight

### Requirement: Print-time estimate
The system SHALL estimate print time in hours behind an
`estimatePrintHours(metrics, settings)` interface, increasing with volume, wall
loops, and support, and increasing as layer height decreases, always returning a
positive value for a non-empty model. The quote SHALL label print time as an
estimate.

#### Scenario: Thinner layers take longer
- GIVEN identical geometry priced at 0.1 mm and 0.3 mm layer height
- WHEN print time is estimated
- THEN the 0.1 mm estimate is greater than the 0.3 mm estimate

#### Scenario: Support adds time
- GIVEN identical geometry with support disabled vs enabled
- WHEN print time is estimated
- THEN the support-enabled estimate is greater

### Requirement: Itemized quote with seven cost factors
The system SHALL produce an itemized quote composed of: (1) material cost
(weight × material rate), (2) print-time cost (hours × time rate), (3) base fee,
(4) post-processing fee, (5) special-request fee, (6) priority fee, and
(7) delivery fee — each fee included only when its option/condition applies — and
SHALL return per-line amounts plus a subtotal and total.

#### Scenario: All factors present
- GIVEN geometry metrics, settings, pricing config, and options enabling
  post-processing, special request, priority, and a delivery type
- WHEN the quote is calculated
- THEN the breakdown contains a line for each of the seven factors
- AND the subtotal equals the sum of the line amounts
- AND each line amount is non-negative

#### Scenario: Optional fees excluded when not selected
- GIVEN options with post-processing, special request, and priority all disabled
- WHEN the quote is calculated
- THEN those three lines are present with amount 0 and do not change the subtotal

### Requirement: Expedited / rush surcharge
The system SHALL support an expedite option that adds a configurable surcharge on
top of the subtotal — a percentage, a flat amount, or the greater of the two as
configured — and SHALL reflect it as a distinct line in the breakdown.

#### Scenario: Expedite percentage applied
- GIVEN a subtotal of 100 and config `expediteSurchargePercent = 50`, mode percent
- WHEN expedite is enabled
- THEN the expedite amount is 50 and the total is 150

#### Scenario: Expedite greater-of percent and flat
- GIVEN a subtotal of 30, `expediteSurchargePercent = 50`, `expediteSurchargeFlat = 20`, mode greater-of
- WHEN expedite is enabled
- THEN the expedite amount is 20 (greater of 15 and 20) and the total is 50

#### Scenario: Expedite disabled
- GIVEN expedite disabled
- WHEN the quote is calculated
- THEN the expedite amount is 0 and the total equals the subtotal (subject to minimum price)

### Requirement: Minimum price floor
The system SHALL enforce a configurable minimum total; if the computed total is
below the minimum, the quoted total is the minimum.

#### Scenario: Below minimum
- GIVEN a computed total of 2.50 and `minimumPrice = 5`
- WHEN the quote is finalized
- THEN the total is 5

### Requirement: Server-authoritative pricing
The system SHALL recompute the quote on the server from `AppSettings.quotingConfig`
using only client-supplied geometry metrics, settings, and option toggles, and
SHALL NOT trust any client-supplied price. The API input schema is zod `.strict()`,
so price/rate/unknown fields are rejected.

#### Scenario: Client price is ignored
- GIVEN a quote request whose body includes an arbitrary `total` or rate field
- WHEN the server validates the request
- THEN the request is rejected (or the price is derived solely from server config)

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

### Requirement: Geometry deviation rejection
When the server recompute succeeds and the client-sent volume understates the
server-computed volume by more than the tolerance (default 10%), the system
SHALL reject the persist request with HTTP 400 (a safe, retry-oriented message)
and SHALL log the deviation event including the request id, both volumes, and
the percentage delta. No quote is persisted for the rejected request. (Policy
decided 2026-06-12 — was previously log-only with server-wins.)

#### Scenario: Suspicious lowball is rejected
- GIVEN a client volume more than 10% below the server-recomputed volume
- WHEN a persisted quote is requested
- THEN the response is 400 with a message asking the customer to reload the
  model and retry
- AND a deviation event is logged with request id, client volume, server
  volume, and delta
- AND no quote is persisted

### Requirement: Quote configuration
The system SHALL source pricing from `AppSettings.quotingConfig` (material rate
per gram, print-time rate per hour, base/post-processing/special-request/priority
fees, expedite mode + percent + flat, minimum price, optional material densities),
applying built-in defaults for any unset field.

#### Scenario: Defaults applied for unset config
- GIVEN an AppSettings document with no quotingConfig overrides
- WHEN a quote is computed
- THEN built-in default rates/fees are used
