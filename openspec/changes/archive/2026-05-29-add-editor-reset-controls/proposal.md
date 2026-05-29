# Proposal: Discoverable Reset-to-Defaults in the Print Config Editor

## Why

Client note 4: the editor should have a reset button to set all values (or a
single value) back to default.

A global reset already exists — "Reset All Settings" in
`components/Editor/result.jsx` (~348–361) — which restores visual, lighting,
printability, and mesh colours to defaults via `levaStore.set(...)`. The gap:

- It lives in the advanced **leva** export controls, which are **hidden in simple
  mode** (the leva panels are only shown when `advancedMode` is true), so most
  customers never see it.
- There is no way to reset a **single** setting to its default ("the value to be
  default") — only everything at once.

## What Changes

- Make a "Reset to defaults" control **discoverable in both generic and advanced
  modes** (not buried in leva-only export controls).
- Add **per-setting reset** so a customer can revert one value to its default
  without resetting the rest.
- Reuse the existing default constants (`defaultVisual`, `defaultLighting`,
  `defaultPrintability`) so "default" stays single-sourced.

## Impact

- **Specs:** modifies `3d-model-editor`.
- **Code:** `components/Editor/result.jsx` (surface global reset outside leva;
  add per-field reset affordance).
- **Depends on:** none. Pairs naturally with `add-generic-print-presets` (same
  editor surface) — ideally built together. See `openspec/ROADMAP.md`.
- **Risk:** low; editor UI only.
