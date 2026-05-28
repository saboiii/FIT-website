# Design: Instant Quoting Engine

## Technical approach

Build the engine as a stack of **pure, dependency-free functions** (GOOS:
small, testable collaborators) that take plain numbers in and return plain
numbers/objects out. Three.js types are touched only at the thin edge
(`geometryVolume.js` reads a `BufferGeometry`); everything downstream operates on
primitives so it runs identically in the browser, in the API route, and in unit
tests with no WebGL/DB/network.

```
THREE.BufferGeometry ──▶ geometryVolume.js ──▶ { volumeCm3, bbox{l,w,h}, manifold }
                                                     │
print settings ─────────────────────────────────────┼──▶ materialEstimate.js ──▶ weightGrams
                                                     │
                                                     ├──▶ printTimeEstimate.js ──▶ hours
                                                     ▼
pricing config (AppSettings) ──▶ quote.js: calculateInstantQuote() ──▶ QuoteBreakdown
```

### Quote computation (the seven factors + expedite)

`calculateInstantQuote({ metrics, settings, pricing, options })` returns:

```
QuoteBreakdown = {
  currency,
  inputs: { volumeCm3, weightGrams, printHours, manifold },
  lines: [
    { key: 'material',       label, amount },   // weightGrams * material.ratePerGram
    { key: 'printTime',      label, amount },   // printHours * printTimeRatePerHour
    { key: 'baseFee',        label, amount },   // pricing.baseFee
    { key: 'postProcessing', label, amount },   // options.postProcessing ? pricing.postProcessingFee : 0
    { key: 'specialRequest', label, amount },   // options.specialRequest ? pricing.specialRequestFee : 0
    { key: 'priority',       label, amount },   // options.priority ? pricing.priorityFee : 0
    { key: 'delivery',       label, amount },   // from deliveryPriceCalculator (or 0 if pickup/unknown)
  ],
  subtotal,                                     // sum(lines)
  expedite: { applied, amount },                // see below
  total,                                        // max(subtotal + expedite, pricing.minimumPrice)
  confidence: 'high' | 'low',                   // low when geometry non-manifold (bbox fallback used)
  estimatedFields: ['printTime'],               // labelled as estimates in UI
}
```

**Material weight** = `volumeCm3 × (shellFraction + (1−shellFraction) × infill) ×
density`, where `density` is per-material (g/cm³) and `shellFraction` derives
from wall loops × nozzle vs. bounding box (clamped 0.15–1.0). This refines the
existing `lib/printPricing.js` "0.3 + 0.7×infill" heuristic with real volume.

**Print time** (heuristic v1): `hours = (extrudedVolumeCm3 / volumetricFlowRate)
+ wallTimeFactor + supportPenalty`, scaled by a layer-height factor
(thinner layers → more passes → more time). Behind an interface
`estimatePrintHours(metrics, settings)` so `add-slicer-accurate-estimation` can
swap in cura-wasm without touching `quote.js`.

**Expedite**: if `options.expedite`, add `max(subtotal × expediteSurchargePercent,
expediteSurchargeFlat)` — config decides whether percent, flat, or the greater
applies. Default config: percent 50, flat 20 (use greater), per client note.

**Minimum price** guards against trivially small quotes.

### Trust boundary

The browser computes the quote for instant feedback, but the **server recomputes
it authoritatively** in `POST /api/quote` (and again when persisting to the
request), using server-side `AppSettings` pricing. The client never sends a
price — only geometry metrics + settings + option toggles. This prevents price
tampering while keeping the UI instant.

### Geometry metrics

`geometryVolume.js` sums signed tetra volumes over triangle faces
(`Σ (v0 · (v1 × v2)) / 6`), converts world units → cm using the model's declared
unit (default mm for STL/3MF; GLTF is meters — apply scene scale). It also
returns the axis-aligned bounding box (for delivery tiers + dimensions) and a
`manifold` heuristic (closed-mesh check via edge parity); when not manifold it
falls back to a filled-bbox volume estimate and marks confidence `low`.

## Architecture decisions

### Decision: Pure functions + server recompute over a client-only calculator
Keeps math unit-testable and prevents price tampering. Slightly more work (two
call sites) but the server module and client module are the *same* `quote.js`.

### Decision: Heuristic print-time now, slicer later
A real slicer (cura-wasm) is heavy (WASM, slow, async) and is overkill for an
*instant* quote. Ship a fast heuristic behind an interface; upgrade later as a
separate change when accuracy demands it.

### Decision: Extend AppSettings rather than a new model
Pricing config is already centralised in the `AppSettings` singleton
(`printPricingFormula`). Extend it for one source of truth and reuse the existing
admin settings plumbing.

## Data flow / state

Editor: leva/store print settings + uploaded geometry → debounced
`calculateInstantQuote` (client) → quote panel. On "Get final quote" / submit →
`POST /api/quote` (server authoritative) → persisted onto `CustomPrintRequest`
(`quote`, `quotedAt`, status → `quoted`).

## File changes

- `lib/quoting/geometryVolume.js` (new)
- `lib/quoting/materialEstimate.js` (new)
- `lib/quoting/printTimeEstimate.js` (new)
- `lib/quoting/quote.js` (new) — `calculateInstantQuote`
- `lib/quoting/pricingDefaults.js` (new) — default densities/rates/fees
- `app/api/quote/route.js` (new)
- `components/Editor/QuotePanel.jsx` (new) + wire into `components/Editor/result.jsx`
- `utils/store.js` (modified) — add `geometryMetrics`, `quote`
- `models/AppSettings.js` (modified) — quoting config fields
- `models/CustomPrintRequest.js` (modified) — `quote` sub-doc + `quotedAt`
- `components/Admin/*` settings (modified) — edit new pricing fields
