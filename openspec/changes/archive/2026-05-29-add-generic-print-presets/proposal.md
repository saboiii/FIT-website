# Proposal: Generic Print Presets (Strength × Quality × Colour) with Instant Pay

## Why

Most customers don't want to think in slicer terms (layer height, wall loops,
infill pattern). The client wants a **generic** configuration path — the default
— expressed in plain language, while keeping the existing **advanced** (leva)
controls for the minority who have specific criteria.

Per the client, generic configuration is three choices:

- **Strength**: `Normal` | `Draft` | `Strong`
  - *Normal* — standard settings.
  - *Draft* — okay to use less filament; for checking dimensions or
    non-load-bearing parts.
  - *Strong* — stronger part, more walls and infill.
- **Quality**: `Draft` | `Medium` | `High`
  - *Draft* — quick prototyping; reduce cost and time.
  - *Medium* — normal settings.
  - *High* — best look.
- **Colour**: a dropdown of available colours/materials (~31 options, e.g. White,
  Black, Wood Colour, Transparent, Marble, Natural, Technology Grey, …).

Crucially: **if the customer chooses generic, they get an instant quote and pay
first** — no waiting for an admin to quote. This directly builds on
`add-instant-quoting-engine` (the dev's note: "there is a library that can do the
cost calculation… this links back to the instant quoting engine").

Today the editor has a 4-button "Simple Mode" (Draft/Standard/High Quality/
Strong & Durable presets in `components/Editor/result.jsx` ~47–52) and 8 colour
swatches (~54–63). This change reshapes that into the client's two-axis
Strength×Quality model plus the full colour palette, and connects it to the
quote+pay flow.

## What Changes

- **Generic mode becomes the default** editor experience; advanced (leva) mode
  remains available via the existing toggle.
- Generic mode exposes three controls: Strength, Quality, Colour.
- A **deterministic mapping** translates (Strength, Quality, Colour) → concrete
  `printSettings` (the existing fields: layerHeight, initialLayerHeight,
  wallLoops, sparseInfillDensity, etc.) so downstream pricing and the print farm
  receive normal settings. Quality drives layer height; Strength drives walls +
  infill; Colour drives mesh colour and (where the colour denotes a material such
  as Wood/Marble/Transparent/Natural) the material selection.
- The colour list is **admin-configurable** (available colours/materials), so the
  storefront only offers what's in stock; each colour MAY carry a material/price
  modifier consumed by the quoting engine.
- On a complete generic selection, the editor computes an **instant quote**
  (via the Instant Quoting Engine) and routes the customer to **pay first**;
  the request is auto-quoted (`configured → quoted`) without admin action.

## Impact

- **Specs:** adds `generic-print-presets`; modifies `3d-model-editor` (generic vs
  advanced modes) and relies on `instant-quoting-engine` (quote inputs) and
  `custom-print-requests` (auto-quote + pay-first path).
- **Code:** `components/Editor/result.jsx` (generic UI + mapping), editor store,
  the colour/material catalogue on `AppSettings`, and the quote/checkout wiring.
- **Depends on:** `add-instant-quoting-engine` (MUST land first). Pairs naturally
  with `add-editor-reset-controls` (same editor surface) and
  `improve-custom-print-post-config-ux` (the pay-first routing). See
  `openspec/ROADMAP.md`.
- **Out of scope:** slicer-accurate costing (`add-slicer-accurate-estimation`);
  per-colour stock management beyond a simple available-list.
- **Risk:** the preset→settings mapping must be agreed with the print farm so
  generic prices are sustainable; mapping lives in one pure, tested module.
