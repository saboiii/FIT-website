# Proposal: Expandable Print-Config View for the Print Farm (Admin)

## Why

The print-farm operator works from the admin custom-print-request view
(`components/Admin/CustomPrintRequests.jsx`). Per the client, the operator should
be able to **read the full print configuration inline** (not only download it as
a file), behind a click-to-expand arrow, so it's easy to work from.

Today the component already renders most of this: an inline "Print Configuration"
grid of all `printSettings` (layer height, material, walls, infill density/
pattern, nozzle, support, print plate) plus `meshColors` swatches
(`CustomPrintRequests.jsx` ~266–310), and download buttons for the config (as
`.txt` JSON) and the model. But:

- The config is rendered **always-expanded and is hidden whenever the row is in
  edit mode** (the view swaps between read-only config and the edit form) — there
  is no explicit, persistent expand/collapse affordance.
- With many requests the list is long; an operator wants to expand just the one
  they're working on.
- The displayed config does not surface the **dimensions/weight and quote
  breakdown** that the Instant Quoting Engine will produce (useful context for
  the operator).

## What Changes

- Turn the per-request print-config section into an explicit **collapsible panel
  with an expand/collapse control (arrow)**, defaulting collapsed, available
  regardless of edit mode.
- Ensure the expanded panel shows the **complete** configuration: all
  `printSettings`, all `meshColors` (with labels), `dimensions`/weight, and — once
  available — the quote breakdown.
- Keep the existing download options (full config + model file).

## Impact

- **Specs:** adds `admin-custom-print-requests`.
- **Code:** `components/Admin/CustomPrintRequests.jsx` (collapsible UI; decouple
  config display from edit mode).
- **Depends on:** none to start; richer once `add-instant-quoting-engine` lands
  (to show dimensions/quote breakdown). Can be built in parallel with the bug
  fixes. See `openspec/ROADMAP.md`.
- **Risk:** low; admin-only display change.
