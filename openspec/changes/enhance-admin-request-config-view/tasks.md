# Tasks: Expandable Print-Config View (Admin)

> Implemented 2026-05-29.

## 1. Collapsible panel
- [x] 1.1 Added an expand/collapse toggle (chevron) per request row; default
      collapsed (`expandedConfig` state)
- [x] 1.2 Decoupled the config display from edit mode — it's viewable regardless
      of whether the row is being edited

## 2. Complete config display
- [x] 2.1 All `printSettings` fields render (existing grid)
- [x] 2.2 All `meshColors` render with labels + swatches (existing)
- [x] 2.3 Added `dimensions` (cm + kg) and the quote total (when available) to the
      expanded panel

## 3. Keep downloads
- [x] 3.1 "Print Config" (JSON) and "Model File" download actions retained

## 4. Verify
- [x] 4.1b `yarn test:run` green (123); component parses clean (esbuild)
- [ ] 4.1 **BLOCKED — needs browser/human:** expand/collapse a request in the admin
      UI and confirm the full config is readable without entering edit mode.
