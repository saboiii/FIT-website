# Proposal: Anchor Editor Panels to the Canvas (layout)

> Status: active. From client manual-testing feedback (#3).

## Why

The editor's overlay UI (instant-quote panel, simple-mode panel + mode toggle)
is `position: fixed`, so it floats against the **viewport** rather than the 3D
canvas, and drifts into the page margins. Worse, the instant-quote panel sits at
`fixed bottom-4 left-4 z-50`, the **same corner and z-index** as the global
"Chat with us" launcher (`fixed bottom-6 left-6 z-50`) — so the chat button
overlays the quote UI.

## What Changes

- Make the editor root a positioning context and anchor the overlays with
  `absolute` (within the canvas area) instead of `fixed` (viewport).
- Move the instant-quote panel to the **top-left** so it no longer collides with
  the bottom-left chat launcher; keep the simple-mode panel + toggle bottom-right.
- Use the root `w-full` (not `w-screen`) to stop horizontal overflow that pushed
  panels into the margins.

## Impact

- **Specs:** `3d-model-editor` (overlay placement).
- **Code:** `components/Editor/result.jsx`, `components/Editor/QuotePanel.jsx`.
- **Tests:** layout is not meaningfully unit-testable; verified in-browser
  (see `verify-quoting-flows-browser`). Existing QuotePanel render tests must stay
  green.
- **Risk:** low — CSS positioning only.
