# Design: Generic Print Presets

## Approach

Keep the translation from human choices to slicer settings in a single **pure,
tested module** (`lib/quoting/genericPresets.js`) so it can be reused by the
editor (live), the quote API (authoritative), and unit tests:

```
mapGenericToPrintSettings({ strength, quality, colour }) -> printSettings
```

The editor's generic mode sets the same `printSettings` shape the advanced leva
panel already produces, so everything downstream (persistence, quote, print farm
display) is unchanged — generic is just a friendlier front-end over the same data.

### Proposed mapping (to be confirmed with the print farm)

Quality → layer height (look/speed):

| Quality | layerHeight | initialLayerHeight |
| ------- | ----------- | ------------------ |
| Draft   | 0.30 mm     | 0.30 mm            |
| Medium  | 0.20 mm     | 0.20 mm            |
| High    | 0.12 mm     | 0.12 mm            |

Strength → walls + infill (durability/material):

| Strength | wallLoops | sparseInfillDensity |
| -------- | --------- | ------------------- |
| Draft    | 1         | 10%                 |
| Normal   | 2         | 20%                 |
| Strong   | 4         | 40%                 |

Colour → `meshColors` (applied to all meshes) and, when the colour denotes a
material (Wood Colour, Light/Dark Wood, Marble, Transparent, Natural, …), the
`materialType` / filament selection used by the quoting engine for density and
rate. The colour catalogue is admin-configured; each entry is
`{ name, hex, material?, priceModifier? }`.

These tables live as data in `genericPresets.js`; the two axes are **orthogonal**
(note the word "Draft" means different things on each axis — Quality-Draft =
thick layers for speed; Strength-Draft = low infill/walls to save filament).

### Instant quote + pay-first flow

```
generic selection ──▶ mapGenericToPrintSettings ──▶ printSettings
        │                                               │
        ▼                                               ▼
   colour/material ───────────────────────▶ calculateInstantQuote (engine)
                                                        │
                                                        ▼
                                        show price ──▶ pay first ──▶ status quoted→payment
```

Because the price is fully determined by the mapped settings + geometry +
colour/material, the generic path needs **no admin quote**: the request is
auto-quoted and the customer proceeds straight to payment
(coordinated with `improve-custom-print-post-config-ux`). Advanced configs may
still follow the existing admin-quote path if desired.

## Architecture decisions

### Decision: Generic is a thin front-end over the existing printSettings
No new persistence shape. The print farm and quoting engine keep consuming
`printSettings`; only the editor's input UI changes. Lowest risk, maximal reuse.

### Decision: Colour catalogue on AppSettings, not hardcoded
Stock changes; the storefront must only offer available colours/materials, and
colour can affect price. Admin-configured list is the single source of truth.

### Decision: Mapping is data + pure function
Lets the print farm tune the tables without code changes to logic, and makes the
price implications unit-testable.

## File changes

- `lib/quoting/genericPresets.js` (new) — mapping tables + `mapGenericToPrintSettings`
- `models/AppSettings.js` (modified) — `printColours` catalogue
  (`{ name, hex, material?, priceModifier? }[]`)
- `components/Editor/result.jsx` (modified) — generic mode UI (3 controls),
  replaces the ad-hoc simple-mode presets/swatches; advanced toggle retained
- editor store + quote/checkout wiring for the pay-first generic path
