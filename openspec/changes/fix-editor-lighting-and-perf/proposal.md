# Proposal: Editor Lighting Preset + Render Responsiveness

> Status: active. From client manual-testing feedback (#8, #5).

## Why

- **Lighting preset is inert (#8).** The viewer passes `preset` to drei's
  `<Stage preset=…>` ([viewer.jsx]), but Stage builds its light rig once and does
  not rebuild when the `preset` prop changes, so switching
  rembrandt/portrait/upfront/soft does nothing visible. (The `<Environment>` is
  already keyed on its prop and does update.)
- **Canvas stutters on every settings change (#5).** Each setting change
  re-renders the R3F tree; `meshColors` is rebuilt as a new object literal every
  render, churning `SceneStyler`'s scene traversal. The client also asked whether
  the work can run "on a separate thread."

## What Changes

- Key `<Stage>` on `preset` so the light rig rebuilds when the preset changes.
- Memoize `meshColors` so the scene-styler effect only runs when colours actually
  change, reducing per-change work.

## Non-goals / clarification (#5 "separate thread")

WebGL rendering must run on the main thread — it cannot be moved to a worker here.
The expensive *pricing* work is already off the main thread (a debounced
server call in `QuotePanel`). The remaining micro-stutter is React reconciling the
scene on each change; `frameloop="demand"` would help but would also stop the
auto-rotate animation, so it is intentionally left continuous. Deeper profiling is
browser-only and deferred to manual QA.

## Impact

- **Specs:** `3d-model-editor` (lighting preset behaviour).
- **Code:** `components/Editor/viewer.jsx`, `components/Editor/result.jsx`.
- **Tests:** browser-verified (drei/WebGL not headless-testable).
- **Risk:** low.
